# Camada de execução em Go — plano de implementação

> **Para quem executa:** use `superpowers:executing-plans` ou `superpowers:subagent-driven-development`. Os passos usam `- [ ]` para acompanhamento.

**Goal:** construir a camada de execução assíncrona em Go (Fase 2 da §36 / T-43.3), começando pelos seis portões de CI que a §24 exige, com o acesso a banco atrás de uma interface para que a lógica seja testável antes de as migrations serem aplicadas.

**Architecture:** serviço próprio em `apps/execution-plane/`, processo de vida longa, fora do ciclo de requisição da Vercel. Drena `channel_outbox_events` pelo protocolo que já existe no banco — `claim` → `begin_attempt` → `complete`/`fail` — e despacha ao `apps/messaging-gateway` por HTTP com assinatura HMAC. O Postgres fica atrás da interface `Fila`, com implementação falsa em teste e implementação PostgREST em produção.

**Tech Stack:** Go 1.24.7 (stdlib apenas — §38 manda preferir stdlib), PostgREST via `net/http`, GitHub Actions.

## Global Constraints

- **Nenhum código Go entra na `main` antes dos seis portões da §24 estarem verdes no CI**: `gofmt`, `go vet`, `staticcheck`, `golangci-lint`, `go test ./...`, `go test -race ./...`.
- **§38 — preferir stdlib.** Nenhuma dependência Go sem justificativa escrita. O alvo é `go.mod` sem `require` de terceiros, exceto as ferramentas de lint, que não entram no binário.
- **`benchmarks/` não é plataforma.** `scripts/medir-distribuicao.mjs` o exclui de propósito; não alterar isso.
- **PROVA-POR-SABOTAGEM.** Todo portão criado aqui precisa ser visto reprovando antes de ser declarado proteção: verde → sabotado/vermelho com a diferença medida → restaurado/verde.
- **§27 — não duplicar domínio.** O envelope trocado com o gateway é o mesmo contrato do TypeScript. Divergência se prova com fixture compartilhada, não com boa vontade.
- Identificador do worker: `p_worker_id` exige `length(btrim(...)) >= 3`; `p_limit` entre 1 e 100; `p_backoff_seconds` entre 0 e 3600; `p_payload_sha256` precisa casar `^[0-9a-f]{64}$`. Violar qualquer um faz o Postgres levantar exceção nomeada.

## O bloqueio que este plano não resolve sozinho

**As filas não existem no banco.** Medido em 10/08/2026 contra o projeto `wyeojufebtwblsubkunr`:

```
tabelas_de_fila_existentes  0   (de 5 esperadas)
rpcs_de_fila_existentes     0   (de 8 esperadas)
total_de_tabelas_public   256
```

`stage22_multiprovider_storage` e `stage22_outbox_delivery` estão no **débito congelado** de `diretrizes/migrations-aplicadas.json`, cuja entrada diz que essas migrations *"só saem do débito após deploy de código compatível, aplicação controlada e testes DB"*.

Consequência para a ordem do trabalho:

- **Tarefas 1 a 4 não dependem disso** e entregam Go real, testado e com portão. É o que este plano executa.
- **A Tarefa 5 depende de aplicar as duas migrations** ao banco — operação controlada, de reversão cara, com responsável nomeado. **Não é decisão desta sessão.**

Isso também **corrige** a `WORKERS.md`, que diz *"existem no esquema"*: existem no **arquivo de migration**, não no banco. A correção entra na Tarefa 1.

---

### Task 1: Os seis portões da §24, e a correção da WORKERS.md

Sem isto, Go entra sem verificação — que é exatamente o modo de falha que este repositório vem consertando (validador que confere artefato e não efeito, VACINA-057).

**Files:**
- Create: `.github/workflows/go-gates.yml`
- Create: `apps/execution-plane/go.mod`
- Create: `apps/execution-plane/identidade.go`
- Create: `apps/execution-plane/identidade_test.go`
- Modify: `diretrizes/WORKERS.md` — corrigir "existem no esquema"
- Modify: `diretrizes/INVENTARIO-DE-EXECUCAO.md` — S-43 volta a `em andamento`, T-43.3 em curso

**Interfaces:**
- Produces: `func IdentidadeDoWorker(host string, pid int) (string, error)` — devolve o `p_worker_id` que as RPCs exigem, ou erro se não atingir 3 caracteres úteis.

- [ ] **Step 1: Escrever o teste que falha**

`apps/execution-plane/identidade_test.go`:

```go
package main

import "testing"

func TestIdentidadeDoWorkerRecusaHostCurto(t *testing.T) {
	// A RPC levanta INVALID_WORKER_ID para btrim menor que 3. Recusar aqui, com
	// mensagem própria, em vez de descobrir no banco em produção.
	if _, err := IdentidadeDoWorker("  ", 1); err == nil {
		t.Fatal("esperava erro para host vazio, veio nil")
	}
}

func TestIdentidadeDoWorkerEhEstavelEIdentificavel(t *testing.T) {
	id, err := IdentidadeDoWorker("runner-7", 4242)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if id != "execution-plane/runner-7/4242" {
		t.Fatalf("identidade inesperada: %q", id)
	}
	if len(id) < 3 {
		t.Fatalf("identidade com menos de 3 caracteres: %q", id)
	}
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/execution-plane && go test ./...`
Expected: FAIL — `undefined: IdentidadeDoWorker`

- [ ] **Step 3: Implementar o mínimo**

`apps/execution-plane/identidade.go`:

```go
// Package main é a camada de execução assíncrona da Innov.
//
// Existe porque o trabalho de fila não pertence ao ciclo da requisição: hoje
// quatro rotas do SINAPI pedem maxDuration=300 e o único despacho assíncrono
// roda dentro do request do usuário. Ver diretrizes/WORKERS.md.
package main

import (
	"fmt"
	"strings"
)

// IdentidadeDoWorker monta o p_worker_id exigido pelas RPCs de reivindicação.
//
// O banco recusa identificador com menos de 3 caracteres após btrim
// (INVALID_WORKER_ID). Validar aqui transforma um erro de produção em um erro
// de partida, que é onde ele custa menos.
func IdentidadeDoWorker(host string, pid int) (string, error) {
	limpo := strings.TrimSpace(host)
	if len(limpo) < 3 {
		return "", fmt.Errorf("host do worker precisa de ao menos 3 caracteres úteis, veio %q", host)
	}
	return fmt.Sprintf("execution-plane/%s/%d", limpo, pid), nil
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/execution-plane && go test ./...`
Expected: PASS, 2 testes

- [ ] **Step 5: Criar o workflow com os seis portões**

`.github/workflows/go-gates.yml` — um job, seis passos, cada um reprovando por conta própria. `staticcheck` está aqui por medição, não por gosto: no experimento da S-43 ele pegou `U1000` em código que `go build` e `go vet` aprovaram.

- [ ] **Step 6: Provar cada portão por sabotagem**

Para cada um dos seis, na ordem de `PROVA-POR-SABOTAGEM.md` §4:

| Portão | Sabotagem | Reprovação esperada |
| --- | --- | --- |
| `gofmt` | trocar indentação por espaços em uma linha | arquivo listado na saída |
| `go vet` | `fmt.Sprintf("%d", "texto")` | `arg "texto" for %d` |
| `staticcheck` | função não exportada e não usada | `U1000` |
| `golangci-lint` | erro de retorno ignorado | `errcheck` |
| `go test` | inverter a comparação da identidade | teste vermelho |
| `go test -race` | duas goroutines escrevendo o mesmo contador | `DATA RACE` |

Registrar a saída de cada um antes de restaurar.

- [ ] **Step 7: Corrigir a WORKERS.md**

Trocar *"Existem no esquema: fila de entrada, fila de saída…"* por a redação que distingue arquivo de migration de banco aplicado, com os números medidos (0 de 5 tabelas, 0 de 8 RPCs, 256 tabelas no `public`).

- [ ] **Step 8: Rodar a bateria inteira e commitar**

Run: os 40 `validate:*`, `pnpm lint`, `pnpm test`
Commit: `T-43.3: os seis portões de Go da §24, provados por sabotagem`

---

### Task 2: O protocolo da fila como domínio tipado, atrás de uma interface — CONCLUÍDA

**Files:**
- Create: `apps/execution-plane/fila.go`
- Create: `apps/execution-plane/fila_falsa_test.go`
- Create: `apps/execution-plane/despacho.go`
- Create: `apps/execution-plane/despacho_test.go`

**Interfaces:**
- Consumes: `IdentidadeDoWorker` da Tarefa 1.
- Produces:
  - `type EventoDeSaida struct { ID, CommandID, ConversationID string; SequenceNumber int64; Topic string; Payload json.RawMessage }`
  - `type Fila interface { Reivindicar(ctx context.Context, limite int) ([]EventoDeSaida, error); IniciarTentativa(ctx context.Context, eventoID, sha256Hex string) error; Concluir(ctx context.Context, eventoID, providerMessageID string) error; Falhar(ctx context.Context, eventoID string, f Falha) error }`
  - `type Falha struct { Classe, CodigoDoProvedor, Motivo string; Retentavel bool; BackoffSegundos int }`
  - `func Drenar(ctx context.Context, f Fila, d Despachante, limite int) (Resultado, error)`

Os limites do banco viram invariantes do tipo: `Falhar` recusa `BackoffSegundos` fora de 0–3600 antes de chegar ao Postgres; `Reivindicar` recusa limite fora de 1–100; `IniciarTentativa` recusa SHA que não case `^[0-9a-f]{64}$`.

- [x] **Step 1: Teste — `Drenar` conclui o evento quando o despacho dá certo**
- [x] **Step 2: Teste — `Drenar` chama `Falhar` com retentável quando o provedor devolve 5xx**
- [x] **Step 3: Teste — `Drenar` chama `Falhar` com não-retentável em 4xx**
- [x] **Step 4: Teste — a ordem por `SequenceNumber` dentro de uma conversa é preservada**
- [x] **Step 5: Teste — reivindicação com limite 0 ou 101 é recusada antes do banco**
- [x] **Step 6: Rodar, confirmar vermelho, implementar, confirmar verde, commitar**

---

### Task 3: Cliente do gateway, com a assinatura provada idêntica à do TypeScript — CONCLUÍDA

**Files:**
- Create: `apps/execution-plane/gateway.go`
- Create: `apps/execution-plane/gateway_test.go`
- Create: `tests/fixtures/assinatura-gateway.json`
- Create: `tests/gateway-assinatura-compartilhada.test.ts`

**Interfaces:**
- Produces: `func AssinarRequisicao(segredo, timestamp, nonce, metodo, caminho string, corpo []byte) string`

A §26 exige contrato entre linguagens provado por fixture. O teste em Go e o teste em TypeScript leem **o mesmo arquivo** e precisam produzir a **mesma assinatura**, byte a byte — a mesma técnica que validou o benchmark, onde os dois runtimes produziram HMAC idêntico.

- [x] **Step 1: Gerar a fixture a partir da implementação TypeScript que já existe** (`apps/messaging-gateway/src/security.ts`), com pelo menos um caso de corpo vazio e um de corpo com acento
- [x] **Step 2: Teste em Go lendo a fixture**
- [x] **Step 3: Teste em TypeScript lendo a mesma fixture**
- [x] **Step 4: Sabotar — mudar a ordem da carga canônica no lado Go e confirmar que o teste reprova**
- [x] **Step 5: Commitar**

---

### Task 4: Laço de vida longa, encerramento limpo e observabilidade

**Files:**
- Create: `apps/execution-plane/main.go`
- Create: `apps/execution-plane/main_test.go`

- [ ] **Step 1: Teste — `SIGTERM` termina o lote em curso e não reivindica outro**
- [ ] **Step 2: Teste — fila vazia espera o intervalo em vez de girar em laço quente**
- [ ] **Step 3: Implementar, provar por sabotagem que o teste de encerramento pega um `os.Exit` abrupto, commitar**

---

### Task 5 — BLOQUEADA: implementação PostgREST e aplicação das migrations

**Não iniciar sem autorização explícita.** Requer aplicar `stage22_multiprovider_storage` e `stage22_outbox_delivery` ao banco de produção, o que a entrada de débito condiciona a *"deploy de código compatível, aplicação controlada e testes DB"*.

Quando autorizada:

- [ ] aplicar as duas migrations em ambiente de homologação primeiro, medindo `0 → 5` tabelas e `0 → 8` RPCs
- [ ] implementar `FilaPostgREST` satisfazendo a interface `Fila` da Tarefa 2
- [ ] provar por sabotagem que a trava funciona: dois workers reivindicando ao mesmo tempo, medir que **nenhum evento é entregue duas vezes**
- [ ] atualizar `diretrizes/migrations-aplicadas.json` por `pnpm ledger:atualizar`
- [ ] só então ligar o consumidor, e medir a fila **drenando** — o portão que a `WORKERS.md` §11.4 pede: o validador **chama** a RPC, não procura o nome dela na migration
