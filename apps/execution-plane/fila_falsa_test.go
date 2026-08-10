package main

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

// filaFalsa registra o que foi pedido, para os testes conferirem a sequência de
// chamadas em vez de conferirem só o resultado final. O que interessa provar
// aqui é o protocolo: reivindicar, abrir tentativa, e então concluir **ou**
// falhar — nunca os dois, nunca nenhum.
type filaFalsa struct {
	lote         []EventoDeSaida
	erroClaim    error
	limitePedido int

	iniciados  []string
	concluidos []string
	falhas     map[string]Falha
	ordem      []string
}

func novaFilaFalsa(lote ...EventoDeSaida) *filaFalsa {
	return &filaFalsa{lote: lote, falhas: map[string]Falha{}}
}

func (f *filaFalsa) Reivindicar(_ context.Context, limite int) ([]EventoDeSaida, error) {
	f.limitePedido = limite
	if f.erroClaim != nil {
		return nil, f.erroClaim
	}
	return f.lote, nil
}

func (f *filaFalsa) IniciarTentativa(_ context.Context, eventoID, sha256Hex string) error {
	f.iniciados = append(f.iniciados, eventoID+":"+sha256Hex)
	return nil
}

func (f *filaFalsa) Concluir(_ context.Context, eventoID, _ string) error {
	f.concluidos = append(f.concluidos, eventoID)
	f.ordem = append(f.ordem, eventoID)
	return nil
}

func (f *filaFalsa) Falhar(_ context.Context, eventoID string, falha Falha) error {
	f.falhas[eventoID] = falha
	f.ordem = append(f.ordem, eventoID)
	return nil
}

// despachanteFalso responde por evento: erro registrado falha, ausência conclui.
type despachanteFalso struct {
	erros     map[string]error
	visitados []string
}

func (d *despachanteFalso) Despachar(_ context.Context, evento EventoDeSaida) (Entrega, error) {
	d.visitados = append(d.visitados, evento.ID)
	if err, existe := d.erros[evento.ID]; existe {
		return Entrega{}, err
	}
	return Entrega{ProviderMessageID: "wamid." + evento.ID}, nil
}

func evento(id, conversa string, sequencia int64) EventoDeSaida {
	return EventoDeSaida{
		ID:             id,
		CommandID:      "cmd-" + id,
		ConversationID: conversa,
		SequenceNumber: sequencia,
		Topic:          "MESSAGE_SEND_TEXT",
		Payload:        json.RawMessage(`{"texto":"olá"}`),
	}
}

// Step 1 — o caminho feliz fecha o evento, e fecha pelo protocolo completo.
func TestDrenarConcluiQuandoODespachoDaCerto(t *testing.T) {
	fila := novaFilaFalsa(evento("e1", "c1", 1))
	despachante := &despachanteFalso{}

	resultado, err := Drenar(context.Background(), fila, despachante, 20)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if resultado.Concluidos != 1 || resultado.Falhados != 0 {
		t.Fatalf("resultado inesperado: %+v", resultado)
	}
	if len(fila.concluidos) != 1 || fila.concluidos[0] != "e1" {
		t.Fatalf("evento não foi concluído: %v", fila.concluidos)
	}
	if len(fila.iniciados) != 1 {
		t.Fatalf("tentativa não foi aberta antes do despacho: %v", fila.iniciados)
	}
	// O SHA vai para o banco, que recusa qualquer coisa fora de ^[0-9a-f]{64}$.
	// Conferir o formato aqui é o que impede a descoberta em produção.
	sha := fila.iniciados[0][len("e1:"):]
	if err := ValidarSHA256(sha); err != nil {
		t.Fatalf("SHA da tentativa não passa na regra do banco: %v", err)
	}
}

// Step 2 — 5xx é falha do outro lado: retenta.
func TestDrenarMarcaRetentavelQuandoOProvedorDevolve5xx(t *testing.T) {
	fila := novaFilaFalsa(evento("e1", "c1", 1))
	despachante := &despachanteFalso{erros: map[string]error{
		"e1": &ErroDoProvedor{Status: 503, Codigo: "unavailable", Motivo: "manutenção"},
	}}

	resultado, err := Drenar(context.Background(), fila, despachante, 20)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if resultado.Falhados != 1 || resultado.Concluidos != 0 {
		t.Fatalf("resultado inesperado: %+v", resultado)
	}
	falha, registrada := fila.falhas["e1"]
	if !registrada {
		t.Fatal("falha não foi registrada na fila")
	}
	if !falha.Retentavel {
		t.Fatal("5xx precisa ser retentável: o defeito é do provedor, não do payload")
	}
	if falha.BackoffSegundos <= 0 {
		t.Fatalf("retentável sem espera reenvia na hora e derruba de novo: %+v", falha)
	}
	if err := falha.Validar(); err != nil {
		t.Fatalf("falha montada viola o contrato do banco: %v", err)
	}
}

// Step 3 — 4xx é o payload: retentar só repete o mesmo erro.
func TestDrenarMarcaNaoRetentavelQuandoOProvedorDevolve4xx(t *testing.T) {
	fila := novaFilaFalsa(evento("e1", "c1", 1))
	despachante := &despachanteFalso{erros: map[string]error{
		"e1": &ErroDoProvedor{Status: 400, Codigo: "invalid_recipient", Motivo: "número inválido"},
	}}

	if _, err := Drenar(context.Background(), fila, despachante, 20); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	falha := fila.falhas["e1"]
	if falha.Retentavel {
		t.Fatal("4xx não pode ser retentável: retentar repete o mesmo erro até esgotar as tentativas")
	}
	if falha.BackoffSegundos != 0 {
		t.Fatalf("não retentável não agenda próxima tentativa: %+v", falha)
	}
}

// 429 é 4xx e mesmo assim retenta — é a exceção que a leitura por faixa erra.
func TestDrenarTrata429ComoRetentavel(t *testing.T) {
	fila := novaFilaFalsa(evento("e1", "c1", 1))
	despachante := &despachanteFalso{erros: map[string]error{
		"e1": &ErroDoProvedor{Status: 429, Codigo: "rate_limited", Motivo: "limite por segundo"},
	}}

	if _, err := Drenar(context.Background(), fila, despachante, 20); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !fila.falhas["e1"].Retentavel {
		t.Fatal("429 é limite de vazão, não payload inválido: precisa retentar")
	}
}

// Erro sem status é rede: o pedido pode ter chegado, então retenta.
func TestDrenarTrataErroDeRedeComoRetentavel(t *testing.T) {
	fila := novaFilaFalsa(evento("e1", "c1", 1))
	despachante := &despachanteFalso{erros: map[string]error{"e1": errors.New("conexão encerrada")}}

	if _, err := Drenar(context.Background(), fila, despachante, 20); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !fila.falhas["e1"].Retentavel {
		t.Fatal("erro de transporte precisa retentar")
	}
}

// Step 4 — ordem dentro da conversa. O banco já ordena na reivindicação; o que
// se prova aqui é que o laço não desfaz essa ordem e que uma falha **barra** os
// posteriores da mesma conversa, senão a mensagem 3 chega antes da 2.
func TestDrenarPreservaAOrdemDentroDaConversa(t *testing.T) {
	fila := novaFilaFalsa(
		evento("e1", "c1", 1),
		evento("e2", "c1", 2),
		evento("e3", "c1", 3),
	)
	despachante := &despachanteFalso{}

	if _, err := Drenar(context.Background(), fila, despachante, 20); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(fila.ordem) != 3 || fila.ordem[0] != "e1" || fila.ordem[1] != "e2" || fila.ordem[2] != "e3" {
		t.Fatalf("ordem da conversa não foi preservada: %v", fila.ordem)
	}
}

func TestDrenarNaoDespachaPosterioresDaConversaDepoisDeFalhar(t *testing.T) {
	fila := novaFilaFalsa(
		evento("e1", "c1", 1),
		evento("e2", "c1", 2),
		evento("e3", "c2", 1),
	)
	despachante := &despachanteFalso{erros: map[string]error{
		"e1": &ErroDoProvedor{Status: 503, Codigo: "unavailable", Motivo: "queda"},
	}}

	resultado, err := Drenar(context.Background(), fila, despachante, 20)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	for _, id := range despachante.visitados {
		if id == "e2" {
			t.Fatal("e2 foi despachado depois de e1 falhar: a conversa sai fora de ordem")
		}
	}
	// A conversa c2 é independente: a queda de c1 não pode travá-la.
	if len(fila.concluidos) != 1 || fila.concluidos[0] != "e3" {
		t.Fatalf("conversa independente foi travada junto: %v", fila.concluidos)
	}
	if resultado.Ignorados != 1 {
		t.Fatalf("o posterior barrado precisa aparecer como ignorado: %+v", resultado)
	}
}

// Step 5 — o limite é recusado antes de virar chamada de banco.
func TestDrenarRecusaLimiteForaDaFaixaAntesDoBanco(t *testing.T) {
	for _, limite := range []int{0, 101, -1} {
		fila := novaFilaFalsa(evento("e1", "c1", 1))
		if _, err := Drenar(context.Background(), fila, &despachanteFalso{}, limite); err == nil {
			t.Fatalf("limite %d passou: o banco levantaria INVALID_CLAIM_LIMIT", limite)
		}
		if fila.limitePedido != 0 {
			t.Fatalf("limite %d chegou à fila antes de ser recusado", limite)
		}
	}
}

func TestDrenarAceitaAsBordasDaFaixa(t *testing.T) {
	for _, limite := range []int{1, 100} {
		fila := novaFilaFalsa()
		if _, err := Drenar(context.Background(), fila, &despachanteFalso{}, limite); err != nil {
			t.Fatalf("limite %d é válido no banco e foi recusado: %v", limite, err)
		}
	}
}
