package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
)

// filaContada conta reivindicações e permite disparar um gancho no meio do lote.
//
// O gancho é o que torna o encerramento testável: ele cancela o contexto
// exatamente quando o primeiro evento do lote está sendo despachado, que é o
// instante em que um `SIGTERM` de verdade chegaria no pior momento possível.
type filaContada struct {
	mu           sync.Mutex
	lotes        [][]EventoDeSaida
	reivindicoes int
	concluidos   []string
	falhados     []string
}

// Os dublês honram o contexto de propósito. Qualquer cliente real — PostgREST,
// HTTP — falha quando o contexto está cancelado, e um dublê que ignora isso
// torna o encerramento intestável: foi o que aconteceu na primeira versão deste
// arquivo, em que sabotar o `context.WithoutCancel` do laço não reprovou teste
// nenhum. Dublê complacente é portão que não mede.
func (f *filaContada) Reivindicar(ctx context.Context, _ int) ([]EventoDeSaida, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.reivindicoes++
	if len(f.lotes) == 0 {
		return nil, nil
	}
	lote := f.lotes[0]
	f.lotes = f.lotes[1:]
	return lote, nil
}

func (f *filaContada) IniciarTentativa(ctx context.Context, _, _ string) error { return ctx.Err() }

func (f *filaContada) Concluir(ctx context.Context, eventoID, _ string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.concluidos = append(f.concluidos, eventoID)
	return nil
}

func (f *filaContada) Falhar(ctx context.Context, eventoID string, _ Falha) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.falhados = append(f.falhados, eventoID)
	return nil
}

func (f *filaContada) leitura() (int, []string, []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.reivindicoes, append([]string(nil), f.concluidos...), append([]string(nil), f.falhados...)
}

type despachanteComGancho struct {
	gancho func(evento EventoDeSaida)
	erro   error
}

func (d *despachanteComGancho) Despachar(ctx context.Context, evento EventoDeSaida) (Entrega, error) {
	if err := ctx.Err(); err != nil {
		return Entrega{}, err
	}
	if d.gancho != nil {
		d.gancho(evento)
	}
	if d.erro != nil {
		return Entrega{}, d.erro
	}
	return Entrega{ProviderMessageID: "wamid." + evento.ID}, nil
}

// esperaFalsa registra o que o laço pediu para dormir, sem dormir de verdade.
type esperaFalsa struct {
	mu       sync.Mutex
	esperas  []time.Duration
	aoDormir func()
}

func (e *esperaFalsa) dormir(_ context.Context, d time.Duration) {
	e.mu.Lock()
	e.esperas = append(e.esperas, d)
	gancho := e.aoDormir
	e.mu.Unlock()
	if gancho != nil {
		gancho()
	}
}

func (e *esperaFalsa) registradas() []time.Duration {
	e.mu.Lock()
	defer e.mu.Unlock()
	return append([]time.Duration(nil), e.esperas...)
}

func lacoDeTeste(fila Fila, despachante Despachante, espera *esperaFalsa, saida *bytes.Buffer) Laco {
	return Laco{
		Fila:                fila,
		Despachante:         despachante,
		Limite:              20,
		IntervaloOcioso:     5 * time.Second,
		PrazoDeEncerramento: 30 * time.Second,
		Dormir:              espera.dormir,
		Log:                 slog.New(slog.NewJSONHandler(saida, nil)),
	}
}

// Step 1 — `SIGTERM` termina o lote em curso e não reivindica outro.
func TestEncerramentoTerminaOLoteEmCursoENaoReivindicaOutro(t *testing.T) {
	fila := &filaContada{lotes: [][]EventoDeSaida{
		{evento("e1", "c1", 1), evento("e2", "c2", 1), evento("e3", "c3", 1)},
		{evento("e4", "c4", 1)},
	}}
	ctx, cancelar := context.WithCancel(context.Background())
	despachante := &despachanteComGancho{gancho: func(evento EventoDeSaida) {
		// O cancelamento chega no meio do lote, despachando o primeiro evento.
		if evento.ID == "e1" {
			cancelar()
		}
	}}
	espera := &esperaFalsa{}
	var saida bytes.Buffer

	estatisticas, err := Executar(ctx, lacoDeTeste(fila, despachante, espera, &saida))
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	reivindicoes, concluidos, _ := fila.leitura()
	if len(concluidos) != 3 {
		t.Fatalf("o lote em curso foi abandonado no meio: concluídos %v", concluidos)
	}
	if reivindicoes != 1 {
		t.Fatalf("reivindicou %d vez(es) depois do cancelamento; esperado parar em 1", reivindicoes)
	}
	if estatisticas.Concluidos != 3 || estatisticas.Lotes != 1 {
		t.Fatalf("estatísticas inesperadas: %+v", estatisticas)
	}
	if !estatisticas.EncerradoPorSinal {
		t.Fatal("o encerramento por sinal precisa ficar registrado, senão parada limpa e queda ficam iguais no log")
	}
}

// Step 2 — fila vazia espera o intervalo em vez de girar em laço quente.
func TestFilaVaziaEsperaOIntervaloEmVezDeGirar(t *testing.T) {
	fila := &filaContada{}
	ctx, cancelar := context.WithCancel(context.Background())
	espera := &esperaFalsa{}
	// Duas voltas ociosas e então encerra, para o teste não rodar para sempre.
	voltas := 0
	espera.aoDormir = func() {
		voltas++
		if voltas >= 2 {
			cancelar()
		}
	}
	var saida bytes.Buffer

	if _, err := Executar(ctx, lacoDeTeste(fila, &despachanteComGancho{}, espera, &saida)); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	esperas := espera.registradas()
	if len(esperas) != 2 {
		t.Fatalf("esperava 2 esperas ociosas, veio %d: %v", len(esperas), esperas)
	}
	for _, d := range esperas {
		if d != 5*time.Second {
			t.Fatalf("espera ociosa fora do intervalo configurado: %v", d)
		}
	}
	reivindicoes, _, _ := fila.leitura()
	if reivindicoes != 2 {
		t.Fatalf("laço quente: %d reivindicações para 2 voltas ociosas", reivindicoes)
	}
}

func TestErroDeReivindicacaoNaoDerrubaOLacoEEsperaAntesDeTentarDeNovo(t *testing.T) {
	// Banco fora do ar não pode virar reinício em laço: sem espera, o worker
	// martela a fila e transforma uma indisponibilidade curta em incidente.
	fila := &filaQuebrada{erro: errors.New("conexão recusada")}
	ctx, cancelar := context.WithCancel(context.Background())
	espera := &esperaFalsa{}
	voltas := 0
	espera.aoDormir = func() {
		voltas++
		if voltas >= 2 {
			cancelar()
		}
	}
	var saida bytes.Buffer

	estatisticas, err := Executar(ctx, lacoDeTeste(fila, &despachanteComGancho{}, espera, &saida))
	if err != nil {
		t.Fatalf("o laço morreu com o banco fora do ar: %v", err)
	}
	if estatisticas.Erros != 2 {
		t.Fatalf("erros não contabilizados: %+v", estatisticas)
	}
	for _, d := range espera.registradas() {
		if d <= 0 {
			t.Fatalf("erro sem espera antes da próxima tentativa: %v", d)
		}
	}
}

func TestLogNaoCarregaOConteudoDaMensagem(t *testing.T) {
	// O corpo do evento é conteúdo de cliente. Log de worker vai para coletor,
	// que replica e retém — é o caminho mais curto entre uma conversa privada e
	// um índice de busca de terceiro.
	const segredo = "confidencial-do-cliente-nao-pode-vazar"
	fila := &filaContada{lotes: [][]EventoDeSaida{{{
		ID: "e1", CommandID: "cmd-1", ConversationID: "c1", SequenceNumber: 1,
		Topic: "MESSAGE_SEND_TEXT", Payload: []byte(`{"texto":"` + segredo + `"}`),
	}}}}
	ctx, cancelar := context.WithCancel(context.Background())
	espera := &esperaFalsa{aoDormir: cancelar}
	var saida bytes.Buffer

	if _, err := Executar(ctx, lacoDeTeste(fila, &despachanteComGancho{}, espera, &saida)); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if strings.Contains(saida.String(), segredo) {
		t.Fatalf("o log carrega o conteúdo da mensagem:\n%s", saida.String())
	}
	if saida.Len() == 0 {
		t.Fatal("o laço não registrou nada: worker mudo é worker que ninguém opera")
	}
}

func TestLogEhEstruturadoETrazOQueSeOperaPor(t *testing.T) {
	fila := &filaContada{lotes: [][]EventoDeSaida{{evento("e1", "c1", 1)}}}
	ctx, cancelar := context.WithCancel(context.Background())
	espera := &esperaFalsa{aoDormir: cancelar}
	var saida bytes.Buffer

	if _, err := Executar(ctx, lacoDeTeste(fila, &despachanteComGancho{}, espera, &saida)); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	var achouLote bool
	for _, linha := range strings.Split(strings.TrimSpace(saida.String()), "\n") {
		var registro map[string]any
		if err := json.Unmarshal([]byte(linha), &registro); err != nil {
			t.Fatalf("linha de log não é JSON: %q", linha)
		}
		if registro["msg"] != "lote drenado" {
			continue
		}
		achouLote = true
		for _, campo := range []string{"reivindicados", "concluidos", "falhados", "ignorados", "duracao_ms"} {
			if _, tem := registro[campo]; !tem {
				t.Fatalf("log do lote sem o campo %q: %v", campo, registro)
			}
		}
	}
	if !achouLote {
		t.Fatalf("nenhum registro de lote drenado:\n%s", saida.String())
	}
}

type filaQuebrada struct{ erro error }

func (f *filaQuebrada) Reivindicar(_ context.Context, _ int) ([]EventoDeSaida, error) {
	return nil, f.erro
}
func (f *filaQuebrada) IniciarTentativa(_ context.Context, _, _ string) error { return nil }
func (f *filaQuebrada) Concluir(_ context.Context, _, _ string) error         { return nil }
func (f *filaQuebrada) Falhar(_ context.Context, _ string, _ Falha) error     { return nil }

// SIGTERM de verdade, no processo do teste.
//
// Os outros testes cancelam o contexto à mão, o que prova o laço mas não prova
// a **fiação** do sinal — e a fiação é o que não se testa em produção sem
// derrubar alguma coisa. `signal.NotifyContext` suprime a ação padrão do
// SIGTERM enquanto está registrado; o sinal só é disparado de dentro do
// despacho, quando o registro já aconteceu, senão o teste mataria a si mesmo.
//
// O que este teste **não** afirma, e por quê: que o laço para exatamente no
// lote seguinte. Entrega de sinal é assíncrona — entre o `kill` e o contexto
// ficar cancelado passa um intervalo que o runtime não promete limitar, e na
// primeira versão deste teste o laço chegou a reivindicar mais um lote antes de
// enxergar o cancelamento. Em produção isso é inofensivo (um lote a mais, todo
// ele com desfecho); num teste, é uma afirmação que reprova por acaso. A parada
// determinística já está provada em
// TestEncerramentoTerminaOLoteEmCursoENaoReivindicaOutro, que cancela o
// contexto diretamente.
//
// O que ele afirma, e que vale em qualquer ordem: o processo não morre, o laço
// termina, o encerramento fica registrado, e **nenhum evento reivindicado fica
// sem desfecho** — que é a propriedade cuja violação deixaria a fila travada
// até o lock_timeout do banco.
func TestSigtermDeVerdadeEncerraOLacoSemAbandonarEvento(t *testing.T) {
	fila := &filaContada{lotes: [][]EventoDeSaida{
		{evento("e1", "c1", 1), evento("e2", "c2", 1)},
		{evento("e3", "c3", 1)},
		{evento("e4", "c4", 1)},
	}}
	despachante := &despachanteComGancho{gancho: func(evento EventoDeSaida) {
		if evento.ID == "e1" {
			if err := syscall.Kill(syscall.Getpid(), syscall.SIGTERM); err != nil {
				t.Errorf("não consegui enviar SIGTERM: %v", err)
			}
		}
	}}
	espera := &esperaFalsa{}
	var saida bytes.Buffer

	estatisticas, err := executarComSinal(lacoDeTeste(fila, despachante, espera, &saida))
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	_, concluidos, falhados := fila.leitura()
	if len(concluidos)+len(falhados) != estatisticas.Reivindicados {
		t.Fatalf(
			"evento reivindicado ficou sem desfecho: %d concluído(s) + %d falhado(s) para %d reivindicado(s)",
			len(concluidos), len(falhados), estatisticas.Reivindicados,
		)
	}
	if len(concluidos) < 2 {
		t.Fatalf("o lote em curso no momento do sinal não terminou: %v", concluidos)
	}
	if !estatisticas.EncerradoPorSinal {
		t.Fatal("encerramento por sinal não ficou registrado")
	}
	if !strings.Contains(saida.String(), "camada de execução encerrada") {
		t.Fatalf("encerramento sem registro no log:\n%s", saida.String())
	}
}
