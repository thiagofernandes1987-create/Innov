package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// O laço de vida longa da camada de execução.
//
// A decisão que define este arquivo: **cancelar o contexto significa "pare de
// reivindicar", não "largue o que está na mão"**. Um `SIGTERM` que aborta o
// lote no meio deixa evento em `CLAIMED` sem tentativa fechada, e o banco só
// libera aquilo quando o `lock_timeout` de dois minutos expira. Multiplicado
// por um deploy que reinicia várias réplicas, é fila parada sem ninguém ter
// derrubado nada.
//
// Por isso o lote roda com `context.WithoutCancel` sobre um prazo próprio: o
// sinal interrompe o **próximo** ciclo, e o ciclo atual termina — ou estoura o
// prazo de encerramento, que existe para o worker não ficar presa a um provedor
// que nunca responde.
//
// Sobre observabilidade: a tarefa previa OpenTelemetry, e ele **não** entra
// aqui. Seria a primeira dependência de terceiro deste módulo, e o `go.mod`
// exige justificativa escrita em revisão para isso (§38). O que entra é
// `log/slog` em JSON, que é stdlib e já dá o que se opera: contagem por lote,
// duração e motivo de encerramento. Trocar por OTel é decisão consciente, com
// ADR, não efeito colateral de uma tarefa de laço.

// Padrões usados pelo binário. Em teste, o Laco é montado à mão.
const (
	limitePadrao              = 20
	intervaloOciosoPadrao     = 5 * time.Second
	esperaAposErroPadrao      = 10 * time.Second
	prazoDeEncerramentoPadrao = 30 * time.Second
)

// Laco é a configuração do worker. Tudo que toca relógio, rede ou banco entra
// por aqui, que é o que torna o encerramento testável sem esperar 5 segundos.
type Laco struct {
	Fila                Fila
	Despachante         Despachante
	Limite              int
	IntervaloOcioso     time.Duration
	EsperaAposErro      time.Duration
	PrazoDeEncerramento time.Duration
	Dormir              func(ctx context.Context, d time.Duration)
	Log                 *slog.Logger
}

// Estatisticas é o resumo de uma execução inteira, para o log de encerramento.
type Estatisticas struct {
	Lotes             int
	Reivindicados     int
	Concluidos        int
	Falhados          int
	Ignorados         int
	Erros             int
	EncerradoPorSinal bool
}

// dormirDeVerdade espera, mas acorda se o contexto acabar antes.
func dormirDeVerdade(ctx context.Context, d time.Duration) {
	temporizador := time.NewTimer(d)
	defer temporizador.Stop()
	select {
	case <-ctx.Done():
	case <-temporizador.C:
	}
}

func (l *Laco) preencherPadroes() {
	if l.Limite == 0 {
		l.Limite = limitePadrao
	}
	if l.IntervaloOcioso == 0 {
		l.IntervaloOcioso = intervaloOciosoPadrao
	}
	if l.EsperaAposErro == 0 {
		l.EsperaAposErro = esperaAposErroPadrao
	}
	if l.PrazoDeEncerramento == 0 {
		l.PrazoDeEncerramento = prazoDeEncerramentoPadrao
	}
	if l.Dormir == nil {
		l.Dormir = dormirDeVerdade
	}
	if l.Log == nil {
		l.Log = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}
}

// Executar roda até o contexto acabar, e devolve o que fez.
//
// O erro devolvido é reservado para defeito de configuração. Banco fora do ar
// **não** é motivo para o laço morrer: sem espera entre tentativas, o worker
// martela a fila e transforma uma indisponibilidade curta em incidente. Erro
// vira contagem, log e espera.
func Executar(ctx context.Context, laco Laco) (Estatisticas, error) {
	laco.preencherPadroes()
	if err := ValidarLimite(laco.Limite); err != nil {
		return Estatisticas{}, err
	}

	estatisticas := Estatisticas{}
	laco.Log.Info("camada de execução iniciada",
		slog.Int("limite", laco.Limite),
		slog.Duration("intervalo_ocioso", laco.IntervaloOcioso),
	)

	for {
		if ctx.Err() != nil {
			estatisticas.EncerradoPorSinal = true
			break
		}

		// O lote em curso sobrevive ao sinal: o que ele não pode é durar para
		// sempre, e é isso que o prazo de encerramento limita.
		ctxDoLote, encerrarLote := context.WithTimeout(context.WithoutCancel(ctx), laco.PrazoDeEncerramento)
		inicio := time.Now()
		resultado, err := Drenar(ctxDoLote, laco.Fila, laco.Despachante, laco.Limite)
		encerrarLote()
		duracao := time.Since(inicio)

		estatisticas.Lotes++
		estatisticas.Reivindicados += resultado.Reivindicados
		estatisticas.Concluidos += resultado.Concluidos
		estatisticas.Falhados += resultado.Falhados
		estatisticas.Ignorados += resultado.Ignorados

		if err != nil {
			estatisticas.Erros++
			// Só a mensagem do erro, que é montada aqui e nos arquivos vizinhos.
			// Nada do payload atravessa: log de worker vai para coletor, que
			// replica e retém.
			laco.Log.Error("drenagem falhou",
				slog.String("erro", err.Error()),
				slog.Int64("duracao_ms", duracao.Milliseconds()),
			)
			laco.Dormir(ctx, laco.EsperaAposErro)
			continue
		}

		laco.Log.Info("lote drenado",
			slog.Int("reivindicados", resultado.Reivindicados),
			slog.Int("concluidos", resultado.Concluidos),
			slog.Int("falhados", resultado.Falhados),
			slog.Int("ignorados", resultado.Ignorados),
			slog.Int64("duracao_ms", duracao.Milliseconds()),
		)

		if resultado.Reivindicados == 0 {
			laco.Dormir(ctx, laco.IntervaloOcioso)
		}
	}

	laco.Log.Info("camada de execução encerrada",
		slog.Int("lotes", estatisticas.Lotes),
		slog.Int("reivindicados", estatisticas.Reivindicados),
		slog.Int("concluidos", estatisticas.Concluidos),
		slog.Int("falhados", estatisticas.Falhados),
		slog.Int("ignorados", estatisticas.Ignorados),
		slog.Int("erros", estatisticas.Erros),
		slog.Bool("encerrado_por_sinal", estatisticas.EncerradoPorSinal),
	)
	return estatisticas, nil
}

func main() {
	registrador := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	identidade, err := IdentidadeDoWorker(hostname(), os.Getpid())
	if err != nil {
		registrador.Error("identidade do worker inválida", slog.String("erro", err.Error()))
		os.Exit(1)
	}

	registrador.Info("worker registrado", slog.String("identidade", identidade))

	// A fila real é a `FilaPostgREST` da Tarefa 5, bloqueada até a aplicação
	// controlada das migrations: medido em 10/08/2026, as tabelas do canal não
	// existem no banco. Falhar aqui é deliberado. Subir com uma fila vazia de
	// mentira seria pior que não subir — o worker reportaria "0 reivindicados"
	// para sempre, e o painel mostraria um sistema saudável drenando uma fila
	// que ninguém criou. É o mesmo silêncio da VACINA-064, do outro lado.
	registrador.Error("sem implementação de fila: a Tarefa 5 do plano está bloqueada até a aplicação controlada das migrations do canal")
	os.Exit(1)
}

// executarComSinal é o `main` que a Tarefa 5 liga quando a fila existir.
//
// Fica escrito agora, e chamado por teste, porque é aqui que mora o
// encerramento limpo: `signal.NotifyContext` cancela o contexto no `SIGTERM`, o
// laço para de reivindicar, e o lote em curso termina. Deixar isso para depois
// seria deixar para depois justamente a parte que não se testa em produção.
func executarComSinal(laco Laco) (Estatisticas, error) {
	ctx, parar := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer parar()
	return Executar(ctx, laco)
}

func hostname() string {
	nome, err := os.Hostname()
	if err != nil || nome == "" {
		return "desconhecido"
	}
	return nome
}
