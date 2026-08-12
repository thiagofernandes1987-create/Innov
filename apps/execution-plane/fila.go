package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// O protocolo da fila de saída, tipado.
//
// A regra que organiza este arquivo: **todo limite que o Postgres cobra vira
// invariante do tipo aqui**. Não por elegância — por onde o erro aparece. Um
// backoff de 86400 enviado ao banco volta como `INVALID_BACKOFF` no meio de um
// lote, depois do despacho já ter acontecido, com a tentativa aberta e sem
// desfecho. Recusado aqui, é erro de programação pego no teste.
//
// As três faixas são cópia literal de `20260804151000_stage22_outbox_delivery.sql`:
//
//	claim_ordered_channel_outbox_events : p_limit           1..100      INVALID_CLAIM_LIMIT
//	begin_channel_delivery_attempt      : p_payload_sha256  ^[0-9a-f]{64}$  INVALID_PAYLOAD_SHA256
//	fail_channel_delivery_attempt       : p_backoff_seconds 0..3600     INVALID_BACKOFF
//
// Quando a migration mudar, estes números mudam junto — e os testes de borda
// são o que obriga a lembrar.

const (
	limiteMinimoDeReivindicacao = 1
	limiteMaximoDeReivindicacao = 100
	backoffMaximoEmSegundos     = 3600
	tamanhoDoSHA256Hex          = 64
)

// EventoDeSaida é uma linha de `channel_outbox_events` já reivindicada.
//
// Só os campos que a camada de execução usa. O resto da linha existe no banco e
// não tem por que atravessar a fronteira: campo que não é lido aqui é campo que
// não pode ficar desatualizado aqui.
type EventoDeSaida struct {
	ID             string
	CommandID      string
	ConversationID string
	SequenceNumber int64
	Topic          string
	Payload        json.RawMessage
}

// Falha é o desfecho negativo de uma tentativa, no vocabulário do banco.
type Falha struct {
	Classe           string
	CodigoDoProvedor string
	Motivo           string
	Retentavel       bool
	BackoffSegundos  int
}

// Validar recusa o que `fail_channel_delivery_attempt` recusaria, e mais uma
// coisa que o banco aceita e não devia: falha terminal com backoff. O banco
// ignora esse número (só calcula `next_attempt_at` quando vai retentar), e
// número persistido que ninguém lê é o começo de um diagnóstico errado.
func (f Falha) Validar() error {
	if strings.TrimSpace(f.Classe) == "" {
		return fmt.Errorf("falha sem classe: o circuito abriria sem registrar a causa")
	}
	if f.BackoffSegundos < 0 || f.BackoffSegundos > backoffMaximoEmSegundos {
		return fmt.Errorf(
			"backoff de %d s fora da faixa do banco (0..%d), que levantaria INVALID_BACKOFF",
			f.BackoffSegundos, backoffMaximoEmSegundos,
		)
	}
	if !f.Retentavel && f.BackoffSegundos != 0 {
		return fmt.Errorf("falha terminal não agenda próxima tentativa, veio backoff de %d s", f.BackoffSegundos)
	}
	return nil
}

// Fila é a fronteira com o Postgres. A implementação PostgREST é a Tarefa 5 do
// plano e está bloqueada: as tabelas não existem no banco, e nenhum consumidor
// pode ser ligado antes da aplicação controlada das migrations.
//
// A interface existe antes da implementação de propósito. É o que permite
// provar o laço de drenagem — ordem, classificação e desfecho — sem banco, e é
// o que impede que a lógica se dissolva dentro do cliente HTTP.
type Fila interface {
	Reivindicar(ctx context.Context, limite int) ([]EventoDeSaida, error)
	IniciarTentativa(ctx context.Context, eventoID, sha256Hex string) error
	Concluir(ctx context.Context, eventoID, providerMessageID string) error
	Falhar(ctx context.Context, eventoID string, f Falha) error
}

// ValidarLimite cobra a faixa de `p_limit` antes da viagem ao banco.
func ValidarLimite(limite int) error {
	if limite < limiteMinimoDeReivindicacao || limite > limiteMaximoDeReivindicacao {
		return fmt.Errorf(
			"limite de reivindicação %d fora da faixa do banco (%d..%d), que levantaria INVALID_CLAIM_LIMIT",
			limite, limiteMinimoDeReivindicacao, limiteMaximoDeReivindicacao,
		)
	}
	return nil
}

// ValidarSHA256 cobra `^[0-9a-f]{64}$` — a mesma expressão da migration.
//
// Escrita à mão em vez de `regexp` porque a §38 manda preferir a stdlib mínima
// e porque a regra é pequena o bastante para não valer um autômato: são 64
// caracteres em um alfabeto de 16.
func ValidarSHA256(valor string) error {
	if len(valor) != tamanhoDoSHA256Hex {
		return fmt.Errorf("SHA-256 precisa de %d caracteres, veio %d", tamanhoDoSHA256Hex, len(valor))
	}
	for i := 0; i < len(valor); i++ {
		c := valor[i]
		hexa := c >= '0' && c <= '9' || c >= 'a' && c <= 'f'
		if !hexa {
			return fmt.Errorf("SHA-256 aceita só hexadecimal minúsculo, veio %q na posição %d", string(c), i)
		}
	}
	return nil
}

// filaValidada envolve qualquer Fila e cobra as invariantes antes de delegar.
//
// Existe porque validar dentro de `Drenar` protegeria só quem passa por
// `Drenar`. A implementação PostgREST da Tarefa 5 vai ser embrulhada por aqui,
// e então nenhum caminho chega ao banco com valor fora de faixa.
type filaValidada struct{ interna Fila }

// ComValidacao devolve a fila com as faixas do banco cobradas na entrada.
func ComValidacao(f Fila) Fila {
	if _, jaValidada := f.(filaValidada); jaValidada {
		return f
	}
	return filaValidada{interna: f}
}

func (f filaValidada) Reivindicar(ctx context.Context, limite int) ([]EventoDeSaida, error) {
	if err := ValidarLimite(limite); err != nil {
		return nil, err
	}
	return f.interna.Reivindicar(ctx, limite)
}

func (f filaValidada) IniciarTentativa(ctx context.Context, eventoID, sha256Hex string) error {
	if strings.TrimSpace(eventoID) == "" {
		return fmt.Errorf("tentativa sem evento")
	}
	if err := ValidarSHA256(sha256Hex); err != nil {
		return err
	}
	return f.interna.IniciarTentativa(ctx, eventoID, sha256Hex)
}

func (f filaValidada) Concluir(ctx context.Context, eventoID, providerMessageID string) error {
	if strings.TrimSpace(eventoID) == "" {
		return fmt.Errorf("conclusão sem evento")
	}
	return f.interna.Concluir(ctx, eventoID, providerMessageID)
}

func (f filaValidada) Falhar(ctx context.Context, eventoID string, falha Falha) error {
	if strings.TrimSpace(eventoID) == "" {
		return fmt.Errorf("falha sem evento")
	}
	if err := falha.Validar(); err != nil {
		return err
	}
	return f.interna.Falhar(ctx, eventoID, falha)
}
