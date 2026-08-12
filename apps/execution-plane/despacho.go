package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
)

// O laço de drenagem e a classificação de falha.
//
// A decisão que este arquivo carrega, e que não é óbvia: **falhar um evento
// barra os posteriores da mesma conversa, no mesmo lote**. O banco já não
// entrega o posterior enquanto o anterior não estiver `PUBLISHED` ou
// `CANCELLED` — mas isso vale entre reivindicações, não dentro de um lote já
// entregue. Sem a barreira aqui, um lote com as mensagens 1, 2 e 3 da mesma
// conversa entrega a 2 e a 3 depois da 1 falhar, e o cliente lê fora de ordem.
// Conversas distintas não se contaminam: a queda de uma não trava as outras.

// Backoffs em segundos, dentro da faixa que o banco aceita (0..3600).
//
// Os números são conservadores de propósito: a ADR-0001 mediu que a necessidade
// é de 1,16 job/s com 57× de folga, então esperar mais custa pouco e insistir
// depressa custa caro do lado do provedor, que foi quem pediu para esperar.
const (
	backoffDeIndisponibilidade = 30
	backoffDeVazao             = 60
	backoffDeRede              = 15
)

// Entrega é o que o provedor devolve quando aceita a mensagem.
type Entrega struct {
	ProviderMessageID string
}

// Despachante é a fronteira com o gateway. O cliente HTTP real é a Tarefa 3.
type Despachante interface {
	Despachar(ctx context.Context, evento EventoDeSaida) (Entrega, error)
}

// ErroDoProvedor carrega o status e o código do provedor, e só isso.
//
// `Motivo` existe para diagnóstico local e **não** é o que vai para o banco:
// `ClassificarFalha` monta o motivo persistido a partir do código, não do texto
// livre. Texto de provedor já chegou com token dentro.
type ErroDoProvedor struct {
	Status int
	Codigo string
	Motivo string
}

func (e *ErroDoProvedor) Error() string {
	return fmt.Sprintf("provedor respondeu %d (%s)", e.Status, e.Codigo)
}

// Resultado é o que uma passagem de drenagem fez, para métrica e log.
type Resultado struct {
	Reivindicados int
	Concluidos    int
	Falhados      int
	Ignorados     int
}

// SHA256Hex é o formato que `begin_channel_delivery_attempt` exige.
func SHA256Hex(payload []byte) string {
	soma := sha256.Sum256(payload)
	return hex.EncodeToString(soma[:])
}

// ClassificarFalha traduz o erro do despacho para o vocabulário do banco.
//
// A separação que importa: 5xx, 408 e 429 são **do outro lado** e melhoram
// sozinhos, então retentam; o resto do 4xx é o nosso payload, e retentar só
// repete o mesmo erro até esgotar `max_attempts`. O 429 é a armadilha — mora na
// faixa 4xx e precisa retentar, então classificar por faixa erra.
func ClassificarFalha(err error) Falha {
	var provedor *ErroDoProvedor
	if !errors.As(err, &provedor) {
		// Sem status não há resposta: o pedido pode ter chegado e a resposta ter
		// se perdido. Retentar é o caminho seguro — a idempotência do lado do
		// provedor é responsabilidade do cliente da Tarefa 3.
		return Falha{
			Classe:          "TRANSPORT_ERROR",
			Motivo:          "falha de transporte antes de resposta do provedor",
			Retentavel:      true,
			BackoffSegundos: backoffDeRede,
		}
	}

	falha := Falha{CodigoDoProvedor: provedor.Codigo}
	switch {
	case provedor.Status == http.StatusTooManyRequests:
		falha.Classe = "PROVIDER_RATE_LIMITED"
		falha.Motivo = "provedor recusou por limite de vazão"
		falha.Retentavel = true
		falha.BackoffSegundos = backoffDeVazao
	case provedor.Status == http.StatusRequestTimeout:
		falha.Classe = "PROVIDER_TIMEOUT"
		falha.Motivo = "provedor esgotou o tempo da requisição"
		falha.Retentavel = true
		falha.BackoffSegundos = backoffDeIndisponibilidade
	case provedor.Status >= http.StatusInternalServerError:
		falha.Classe = "PROVIDER_UNAVAILABLE"
		falha.Motivo = "provedor indisponível"
		falha.Retentavel = true
		falha.BackoffSegundos = backoffDeIndisponibilidade
	default:
		falha.Classe = "REQUEST_REJECTED"
		falha.Motivo = "provedor recusou a requisição"
		falha.Retentavel = false
	}
	return falha
}

// Drenar reivindica um lote e o processa até o fim, evento por evento.
//
// O protocolo por evento é sempre o mesmo, e é o que os testes conferem: abrir
// a tentativa com o SHA do payload, despachar, e então concluir **ou** falhar.
// Nunca os dois, nunca nenhum — tentativa aberta sem desfecho é o que faz o
// comando ficar preso em CLAIMED até o `lock_timeout` do banco expirar.
func Drenar(ctx context.Context, fila Fila, despachante Despachante, limite int) (Resultado, error) {
	if err := ValidarLimite(limite); err != nil {
		return Resultado{}, err
	}
	protegida := ComValidacao(fila)

	eventos, err := protegida.Reivindicar(ctx, limite)
	if err != nil {
		return Resultado{}, fmt.Errorf("reivindicar da fila: %w", err)
	}

	resultado := Resultado{Reivindicados: len(eventos)}
	// Conversa que falhou no lote: os posteriores dela não são despachados.
	travadas := map[string]struct{}{}

	for _, evento := range eventos {
		if _, travada := travadas[evento.ConversationID]; travada {
			resultado.Ignorados++
			continue
		}

		sha := SHA256Hex(evento.Payload)
		if err := protegida.IniciarTentativa(ctx, evento.ID, sha); err != nil {
			return resultado, fmt.Errorf("abrir tentativa do evento %s: %w", evento.ID, err)
		}

		entrega, erroDeDespacho := despachante.Despachar(ctx, evento)
		if erroDeDespacho != nil {
			falha := ClassificarFalha(erroDeDespacho)
			if err := protegida.Falhar(ctx, evento.ID, falha); err != nil {
				return resultado, fmt.Errorf("registrar falha do evento %s: %w", evento.ID, err)
			}
			resultado.Falhados++
			travadas[evento.ConversationID] = struct{}{}
			continue
		}

		if err := protegida.Concluir(ctx, evento.ID, entrega.ProviderMessageID); err != nil {
			return resultado, fmt.Errorf("concluir o evento %s: %w", evento.ID, err)
		}
		resultado.Concluidos++
	}

	return resultado, nil
}
