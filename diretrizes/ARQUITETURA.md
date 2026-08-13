# Arquitetura canônica — Innovar Platform

**Versão estável:** 0.19.0  
**Atualizado em:** 12 de agosto de 2026

## 1. Visão geral

A Innovar Platform é um monólito modular web com banco relacional, autenticação gerenciada, Storage privado, RPCs transacionais e workers especializados.

```text
Navegador
  ↓
Next.js 16 / React 19
  ├─ Server Components
  ├─ Server Actions
  ├─ Route Handlers
  └─ sessão e autorização
  ↓
Supabase
  ├─ Auth
  ├─ PostgreSQL
  ├─ RLS
  ├─ RPCs transacionais
  └─ Storage privado

Workers e serviços isolados
  ├─ DOCX → PDF
  ├─ entrega de assinatura
  ├─ antimalware
  └─ messaging-gateway
```

## 2. Organização do repositório

```text
app/                    rotas, páginas, actions e APIs
components/             componentes de interface
lib/                    domínio, autorização e integrações
apps/messaging-gateway/ gateway isolado de mensagens
python/                 motor auxiliar de Qualidade
scripts/                validadores, workers e testes
supabase/migrations/     evolução append-only do banco
supabase/tests/          testes SQL reproduzíveis
docs/                   histórico técnico e evidências
diretrizes/             especificação canônica
.github/workflows/       CI e homologação
```

## 3. Modularidade e autorização

O catálogo existe em `lib/modules/registry.ts` e `app_modules`. Cada aplicativo possui chave estável, rota, dependências, versão, estado por organização, configurações e matriz de permissões.

Camadas de autorização:

1. sessão autenticada;
2. organização ativa;
3. módulo habilitado;
4. perfil e nível;
5. capacidade;
6. escopo de organização, cliente, obra ou recurso;
7. override `ALLOW`/`DENY`;
8. RLS;
9. política de Storage;
10. autorização interna em RPC privilegiada.

Negação explícita prevalece. Ações críticas podem exigir AAL2, justificativa, separação de funções, alçada, idempotency key, aprovação de uso único e auditoria.

## 4. Banco e migrations

Convenções:

- UUID e timestamps UTC;
- `organization_id` em dados multiempresa;
- `project_id` e `client_id` quando aplicáveis;
- constraints para invariantes locais;
- triggers para regras centrais;
- RPC para operações multi-tabela;
- índices em FKs e filtros de RLS;
- migrations append-only em ordem lexical;
- `SECURITY DEFINER` com `search_path` explícito e privilégio mínimo.

Migration aplicada nunca é reescrita. O replay integral continua requisito de recuperação.

## 5. Domínios operacionais consolidados

### Estoque

Razão imutável, saldos derivados, reversão, advisory lock por posição, reservas, ativos e inventário físico.

### CRM, Cliente 360 e SAC

Pipeline interno, múltiplas obras por cliente, consentimentos, SAC interno/portal, mensagens públicas/internas, anexos privados e eventos append-only.

### Auditoria e observabilidade

Fluxo unificado sem duplicar trilhas, `correlation_id`, sanitização, idempotência, alertas, health checks, diagnósticos e retenção configurável.

## 6. Arquitetura de mensagens — Etapa 22

### 6.1 Princípio provider-neutral

O domínio não importa tipos nativos de provider. Contatos, conversas, mensagens, mídias, receipts, contas e identidades permanecem canônicos.

```text
UI / workflows / plugins / IA
              ↓
       contratos canônicos
              ↓
 MessagingEngine + capability matrix
      ├─ Meta Cloud
      └─ gateway isolado / adapter Baileys experimental
```

Meta Cloud permanece o único runtime WhatsApp implementado no monólito. `WHATSAPP_WEB_BAILEYS` não é registrado no bootstrap produtivo.

### 6.2 Gateway isolado

O `apps/messaging-gateway` é um serviço Node.js separado do Next.js. Possui:

- HMAC-SHA256 e replay guard;
- limites de corpo, headers e timeout;
- health, readiness e métricas;
- graceful shutdown;
- container non-root, filesystem read-only, capabilities removidas e limites de recursos;
- `FakeChannelClient` como runtime padrão;
- adapter Baileys confinado e sem conexão externa automática.

O gateway não acessa diretamente o domínio de negócio nem o banco principal por credenciais amplas.

### 6.3 Pipeline de ingresso

```text
evento do provider
→ sanitização e envelope canônico
→ persist-before-dispatch
→ idempotência
→ resolução de organização/conta/identidade
→ mídia segura quando aplicável
→ dispatch para inbox, plugins e workflows
```

IA e automações são bloqueadas antes do estado persistido.

### 6.4 Pipeline de saída

```text
comando canônico
→ outbox durável
→ ordenação por conversa
→ política/capability/consentimento
→ rate limit e circuit breaker
→ adapter
→ ledger de tentativa
→ receipt/reconciliação
→ retry limitado ou DLQ
```

Não há envio automático por IA. O modo é `DRAFT_ONLY`.

### 6.5 Sessões e concorrência

O modelo experimental prevê:

- credenciais cifradas e versionadas;
- key updates transacionais;
- lease por sessão;
- single writer;
- fencing token em toda escrita sensível;
- takeover somente após expiração;
- purge auditado;
- restore sintético em infraestrutura nova.

Esses controles foram testados com fixtures; nenhuma sessão real foi criada.

### 6.6 Identidades e mídia

- PN e LID são aliases técnicos de identidade canônica;
- observação não equivale a confirmação;
- merges preservam aliases e histórico;
- mídia usa streaming limitado, quarentena privada, antivírus, MIME real, SHA-256 e URL assinada somente após `CLEAN`;
- base64 persistente é proibido.

### 6.7 Inbox, playbooks, plugins e IA

- inbox unificada por contato, mantendo origem do provider;
- atribuição versionada, notas internas e presença separada;
- playbooks versionados apontam para fontes canônicas;
- conteúdo contratual é `HUMAN_ONLY` ou `CANONICAL_ONLY`;
- plugins têm prioridade determinística e short-circuit;
- consentimento e anti-spam precedem automações;
- IA é último recurso, independente do canal e `DRAFT_ONLY`;
- handoff humano persistente desabilita IA na conversa.

### 6.8 Segurança e observabilidade

Trust boundaries: navegador/Next.js, Supabase, gateway, adapter/provider, KMS/HSM e serviços externos.

Controles:

- STRIDE e allowlist de ferramentas;
- aprovação para escritas críticas;
- redaction de logs;
- scanner de segredos e SBOM;
- retenção, purge e auditoria de leitura sensível;
- incidentes e resposta a comprometimento;
- métricas de baixa cardinalidade;
- traces por correlação/causação;
- alertas de reconnect loop, DLQ, perda de lease e persistência de keys;
- dashboard e runbooks.

## 7. Estado de promoção

- W-19 comprovou chaos e performance apenas em ambiente sintético;
- W-20 definiu homologação fail-closed, mas não executou homologação real;
- W-21 definiu piloto e rollback, porém a decisão é `HOLD`;
- W-22 encerra o escopo técnico/documental;
- produção é `NOT_AUTHORIZED`;
- QR, pairing, número, sessão, tráfego, deploy e piloto reais não foram executados;
- PR `#40` permanece draft até revisão técnica e de segurança.

## 8. Storage e dados sensíveis

Buckets permanecem privados. Upload valida sessão, módulo, tipo, tamanho, contexto e hash. Downloads usam URL assinada curta ou rota autenticada. Segredos, tokens, credenciais, payload bruto, telefone e conteúdo de mensagem não entram em logs ou labels de métrica.

## 9. Frontend

- TypeScript estrito;
- Server Components por padrão;
- Server Actions para mutações;
- validação server-side;
- acessibilidade e responsividade;
- estados vazios, degradados e acesso negado explícitos.

## 10. CI e recuperação

Ordem mínima: documentação, vacinas, ledger, validadores estruturais, testes PostgreSQL, lint, typecheck, TypeScript, Python, build do gateway, smoke do container e build Next.js.

A reconstrução exige clone do GitHub, secrets externos, migrations ordenadas, ledger compatível, dependências, validadores e smoke tests. Procedimento: `diretrizes/RECUPERACAO.md`.


---

## 11. Arquitetura final — linguagem por camada

Acrescentado em 12/08/2026, porque até aqui este documento descrevia a
plataforma **como ela é** e não dizia para onde ela vai. Quem lia a §1 concluía
que a arquitetura final é a atual, e não é.

O documento normativo é [`MAPA-TECNOLOGICO.md`](MAPA-TECNOLOGICO.md); esta seção
é o resumo executável dele, com o **estado medido de cada fase**.

| Camada | Linguagem | Estado em 12/08/2026 |
| --- | --- | --- |
| Interface, server actions, rotas | **TypeScript** | vigente — 84,3% do código vivo, e nenhuma conversão prevista |
| Regra de negócio derivada de dado | **SQL** (view/RPC) | vigente — é onde E3, E4 e E6 nascem |
| Plano de execução: fila, varredura, cobrança | **Go** (`apps/execution-plane`) | construído e **sem consumidor** — as filas não existem no banco |
| IA, RAG, OCR, plantas | **Python** | **Fase 4** — não existe código; não é conversão, é construção |
| Componentes de altíssimo desempenho | **Rust** | **Fase 6**, vedada pela §9.3 até cinco pré-requisitos, incluindo protótipo e benchmark |

**A regra que antecede as cinco linhas:** §37 do mapa — *nenhuma linguagem nova
entra no repositório sem ADR* com os doze itens que ela lista. A ADR-0001
(camada de execução em Go) está ratificada por instrução do proprietário
arquitetural, com a divergência entre o recomendado e o decidido registrada nela
própria.

### 11.1 O que o benchmark da ADR-0001 contrariou

Vale estar aqui porque é o número que impede repetir a decisão por intuição:

```
CPU num job de despacho ............... 0,03%
economia de trocar Node por Go ........ 0,41 s de CPU por dia a 100 mil msg/dia
saturação Node ........................ 6.549 jobs/s
saturação Go .......................... 27.884 jobs/s
necessidade medida .................... 1,16 job/s   →  57× de folga
`map[string]any` em vez de struct ..... 2,14× mais caro que a diferença entre as linguagens
```

A ADR por isso separa o que o mapa juntava: **extrair a camada do request é
decisão incondicional**; **a linguagem é decisão condicionada**.

---

## 12. Arquitetura final — o que ainda não existe, por módulo

A lógica de cada módulo mora em
[`CONFRONTO-ODOO-19-E-INNOV.md`](CONFRONTO-ODOO-19-E-INNOV.md), e a **R8** manda
apontar em vez de repetir. O que este documento acrescenta é a **espinha de
dependência**, que é arquitetura e não escopo:

```
E1 custo/hora  →  E2 apontamento de hora  →  E3 rentabilidade em três colunas
   │                                            (SQL: view/RPC)
   ├─→ E4 comprometido do orçamento (SQL)
   └─→ E5 lead time e chegada prevista (SQL + TS)

E7 relatórios de ausência (Go)   — não depende de nada, entrega sozinho
E9 solicitação de documento      — SQL + TS + Go (a cobrança)
```

**E3 não fecha sem E2, e E2 não fecha sem E1.** É por isso que o custo/hora —
uma coluna que já existe desde a etapa 12 — trava sete módulos: não por estar
faltando, mas por não ter dono, vigência nem uso.

Decidido em 12/08/2026 (T-52.1): **o custo pertence à pessoa, com vigência**, em
tabela do módulo `equipes`, com vínculo opcional a `rh_workers` — e não em
`rh_workers` diretamente, porque ele não existe no servidor e ancorar ali
acorrentaria sete módulos ao lote de RH.

---

## 13. A distância entre o repositório e o servidor

> ⚠️ **Os números desta seção foram medidos no projeto Supabase errado**
> (`wyeoju…`, e não `jpqoje…`), em 12/08/2026. Ficam aqui porque apagar
> medição errada esconde que ela existiu; **não valem para esta plataforma** até
> serem refeitos. A correção é a S-79.

Esta seção existe porque a §4 diz *"migrations ordenadas"* e isso descreve a
intenção, não o estado. Medido em 12/08/2026, contra o banco de produção:

| | |
| --- | ---: |
| Migrations no repositório | 273 |
| Aplicadas | 210 |
| **Pendentes** | **121** |
| Tabelas no banco | 245 |
| Tabelas no banco **sem `create table` em migration nenhuma** | **77** |
| Funções no banco | 252 |
| Funções que o repositório declara | 407 |

São duas divergências de direções opostas, e as duas são arquitetura:

- **o repositório tem o que o banco não tem** — 121 migrations, entre elas as 67
  de `rh_*` e as 28 de `stage22_*`. O módulo de RH não existe para nenhum
  usuário; as filas do canal não existem, e por isso o plano de execução em Go
  está construído e sem consumidor;
- **o banco tem o que o repositório não declara** — 77 tabelas e 7 colunas.
  Recriar o banco a partir deste repositório produziria um schema que o código
  não consegue usar. É a S-77.

Enquanto as duas não fecharem, *"a reconstrução exige clone do GitHub e
migrations ordenadas"* — §10 — **não é verdade**, e está escrito aqui em vez de
ser descoberto no dia da reconstrução.
