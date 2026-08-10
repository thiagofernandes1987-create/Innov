// Package main é a camada de execução assíncrona da Innov.
//
// Existe porque trabalho de fila não pertence ao ciclo da requisição. Medido em
// diretrizes/WORKERS.md: quatro rotas do SINAPI pedem maxDuration=300 e o único
// despacho de fato assíncrono roda dentro do request do usuário.
//
// A ADR-0001 registra que a escolha de Go aqui **não** se sustenta por
// desempenho — a CPU é 0,03% de um job de despacho — e sim por decisão
// arquitetural do proprietário. Isso importa para quem mantém: não otimize este
// código por instinto de velocidade; o gargalo é rede, e está fora daqui.
package main

import (
	"fmt"
	"strings"
)

// IdentidadeDoWorker monta o p_worker_id exigido pelas RPCs de reivindicação.
//
// O banco recusa identificador com menos de 3 caracteres após btrim, com
// INVALID_WORKER_ID. A validação aqui é a mesma regra, cobrada mais cedo.
func IdentidadeDoWorker(host string, pid int) (string, error) {
	limpo := strings.TrimSpace(host)
	if len(limpo) < 3 {
		return "", fmt.Errorf("host do worker precisa de ao menos 3 caracteres úteis, veio %q", host)
	}
	return fmt.Sprintf("execution-plane/%s/%d", limpo, pid), nil
}
