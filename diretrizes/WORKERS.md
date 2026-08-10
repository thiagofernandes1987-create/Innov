# Classificação dos workers

**Documento canônico:** sim
**Cumpre:** último item da **Fase 1** da §36 do [`MAPA-TECNOLOGICO.md`](./MAPA-TECNOLOGICO.md) — *"classificar todos os workers existentes"*.
**Por que existe:** a Fase 2 pede *"migrar workers apropriados"*. Sem saber quais existem, "apropriados" não tem sujeito, e a ADR da §37 não tem como estimar impacto.

Levantado por descoberta no código, não por memória: gatilhos agendados, rotas de API, RPCs de fila, e busca por laço de consumo.

---

## O achado que muda a Fase 2

**A camada de execução assíncrona foi desenhada no banco e nunca construída no runtime.**

Estão **escritas em migration**: fila de entrada, fila de saída com número de sequência, circuitos de entrega, baldes de limitação de taxa, registro de tentativas e reconciliação de comandos não confirmados, mais as funções de reivindicação, com trava. E existe validador conferindo tudo isso.

> **Correção de 10/08/2026 — a redação anterior dizia "existem no esquema", e isso estava impreciso de um jeito que muda a conclusão.** Elas existem no **arquivo de migration**, não no banco. Consultado o projeto `wyeojufebtwblsubkunr`:
>
> ```
> tabelas_de_fila_existentes    0   (de 5)
> rpcs_de_fila_existentes       0   (de 8)
> total_de_tabelas_public     256
> ```
>
> `stage22_multiprovider_storage` e `stage22_outbox_delivery` estão no **débito congelado** de `migrations-aplicadas.json`, que condiciona a saída a *"deploy de código compatível, aplicação controlada e testes DB"*. Ou seja: não é só que ninguém consome a fila — **a fila não está lá para ser consumida.** Nenhum consumidor pode ser ligado antes dessa aplicação, e ela é decisão do responsável nomeado, não de uma sessão assistida.

O que não existe é **quem consome** — e, no banco, nem o que seria consumido:

| RPC de fila | quem referencia | consumidor em runtime |
| --- | --- | --- |
| `claim_channel_ingress_events` | `scripts/validate-messaging-ingress.mjs` | **nenhum** |
| `claim_channel_outbox_events` | `scripts/validate-messaging-storage.mjs` | **nenhum** |
| `claim_ordered_channel_outbox_events` | `scripts/validate-messaging-outbox.mjs` | **nenhum** |
| `reconcile_unconfirmed_channel_commands` | `scripts/validate-messaging-outbox.mjs` | **nenhum** |
| `claim_whatsapp_outbound_dispatch` | `app/actions/whatsapp.ts` | **sim, mas dentro do request do usuário** |

E os validadores que as citam **não as chamam**: eles conferem que o token aparece no texto da migration. É a VACINA-057 outra vez, em escala maior — *validador confere o artefato, não o efeito*. A fila existe, a trava existe, o teste do artefato passa, e nada drena.

Busca por laço de consumo em `app/`, `lib/messaging/` e `apps/messaging-gateway/src/`: o único `setInterval` é o heartbeat de presença de uma tela (60s), e o único `while (true)` segue redirecionamento numa sonda do SINAPI. **Não há poller, não há consumidor, não há `pg_cron`.**

### O que isso significa para a §36

A Fase 2 diz *"introduzir Go; **migrar** workers apropriados"*. Não há o que migrar: há **um** worker de fato assíncrono, e ele roda dentro do request. A Fase 2, na prática, é **construção**, não migração.

Isso não enfraquece a decisão por Go nessa camada — **fortalece**, e por um motivo prático: greenfield não tem custo de reescrita, não tem risco de paridade de comportamento e não tem janela de manutenção dupla. O que muda é o texto da ADR: a pergunta não é *"reescrever workers Node em Go"*, é *"em que linguagem construir a camada que ainda não existe"*.

---

## Inventário

### 1. Agendados — 2

| worker | gatilho | cadência | duração típica | reexecutável sem efeito duplicado? | camada §21 |
| --- | --- | --- | --- | --- | --- |
| Atualização do SINAPI | GitHub Actions | `0 9 15 * *` — dia 15, 09h | minutos; o parse de 15 MB custa **10.035 ms** medidos | **sim** — versão por competência, com `parserVersion` e SHA-256 do pacote | Go (§7.4, *SINAPI / CUB*) |
| CUB do Sinduscon | Vercel cron | `0 10 5 * *` — dia 5, 10h | segundos; `maxDuration = 60` | **sim** — grava por competência e recusa série atrasada em relação à notícia | Go (§7.4) |

Ambos são o caso que a §7.1 descreve: trabalho de longa duração, disparado por agenda, independente do request. O segundo já esbarra no teto de 60s da plataforma.

### 2. Por evento — 2 webhooks

| worker | gatilho | duração | reexecutável? | camada §21 |
| --- | --- | --- | --- | --- |
| `/api/webhooks/whatsapp` | provedor | ms | **sim** — guarda de monotonicidade (FND-0007) | Go (§7.4, *WhatsApp*) |
| `/api/signatures/webhook` | provedor de assinatura | ms | **sim** — idempotência por envelope | Go (§7.4, *Assinatura digital*) |

Recebem e persistem. **Não despacham**: o despacho seria trabalho da fila de saída, que não tem consumidor.

### 3. Longa duração dentro do request — 6

Não são workers; são rotas que fazem trabalho de worker no tempo do usuário. É a fronteira que a §5.5 do mapa manda não cruzar.

| rota | `maxDuration` |
| --- | --- |
| `internal/sinapi-atualizacao` | 300 s |
| `internal/sinapi-leitura-real` | 300 s |
| `internal/sinapi-source-probe` | 300 s |
| `internal/sinapi-source-probe-v2` | 300 s |
| `cost-sources/sinapi/import` | 60 s |
| `cron/cost-sources/sinduscon` | 60 s |

Quatro pedindo **cinco minutos** de request é o sinal mais claro do inventário: esse trabalho quer sair do caminho da requisição.

### 4. Geração de documento sob demanda — 6

PDF de contrato, de proposta, de holerite, exportação de relatório, e os anexos de RH (FGTS rescisório, MIT, lote de pagamento). Síncronos, no request. A §7.4 os reivindica para Go em *Documentos*; hoje nenhum é assíncrono.

### 5. Gateway de mensageria — 1 serviço

`apps/messaging-gateway` roda como serviço próprio, isolado, sem acesso a banco, com cliente `fake` ativo. É o candidato inicial da ADR — atende aos critérios 2, 3, 4, 5, 6 e 8 da §4.

---

## Critério de reexecução

Todos os quatro workers reais (2 agendados, 2 webhooks) são **reexecutáveis sem efeito duplicado**, e cada um por um mecanismo diferente e já testado: versão por competência, SHA-256 do pacote, guarda de monotonicidade e idempotência por envelope. Isso importa para a Fase 2 — fila com *retry* exige idempotência, e ela já existe onde precisa existir.

---

## O que a ADR da §37 precisa levar daqui

1. **Não é migração, é construção.** Um único worker assíncrono existe, e roda dentro do request.
2. **Quatro filas prontas e sem consumidor.** O esquema, as travas e a ordenação já estão no banco; falta o processo que drena.
3. **Quatro rotas pedindo 300 s de request.** É o volume de trabalho que quer sair do caminho da requisição, e o número que justifica a camada.
4. **Idempotência já resolvida** nos quatro workers reais — o pré-requisito de *retry* não é dívida.
5. **O gateway já é serviço isolado**, então a primeira fronteira de processo não precisa ser inventada.
