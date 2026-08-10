# Decisão tecnológica por módulo — o que usar, quando, e por quê

**Documento canônico:** sim
**Existe porque:** a §21 do [`MAPA-TECNOLOGICO.md`](./MAPA-TECNOLOGICO.md) diz *qual* linguagem, e não diz *quando*. Módulo que ainda não existe e módulo já implantado aparecem na mesma linha, com a mesma tinta — e foi assim que "converter para Go" virou uma frase sem sujeito.
**Regra de leitura:** a §21 é **autorização**, não orçamento (reconciliação registrada no preâmbulo do mapa). Esta tabela é o **quando**.

---

## 1. O procedimento, antes da tabela

Para qualquer módulo, nesta ordem:

1. **O módulo existe hoje?** Se não existe, não há conversão — há construção, e ela obedece à fase da §36, não à §21.
2. **O trabalho sai do ciclo da requisição?** Se sim, é candidato à camada de execução. Se não, permanece no monólito modular (§4: *"se nenhuma dessas condições existir, o padrão deve ser permanecer no monólito"*).
3. **Há medição que sustente a troca?** A §39 proíbe trocar tecnologia por reputação. Sem número, não se troca.
4. **A mudança duplica domínio?** Se o contrato passa a existir em duas linguagens, a §26 exige fixture compartilhada provando que as duas produzem o mesmo resultado — como foi feito no benchmark, em que os dois runtimes produziram HMAC byte a byte idêntico.

---

## 2. A decisão de banco de dados — e por que não há MySQL

**PostgreSQL em todos os casos. MySQL não entra em nenhum módulo.** A decisão precisa ficar explícita porque a pergunta foi feita, e responder "conforme a necessidade" sem dizer qual necessidade é como não responder.

Não é preferência de gosto. É que a plataforma depende de quatro coisas que **não existem no MySQL**:

| O que a Innov usa | Onde vive | Existe no MySQL? |
| --- | --- | --- |
| **RLS** — toda a autorização multi-tenant | policy por tabela, 389 policies em produção | **não** |
| `has_module_permission(org, módulo, nível, projeto, ação)` | PL/pgSQL, `security definer` | não — não há equivalente com o mesmo modelo |
| `pgvector`, para o RAG da §31 | extensão | não |
| `jsonb` com índice GIN, `setof record`, tipos compostos | usados nas 252 funções | parcialmente, com semântica diferente |

Um segundo banco sem RLS significaria **duas autoridades de permissão**, que é exatamente o que a §27 (contra duplicação de domínio) e a §43 (autoridade única) proíbem. O primeiro dado gravado do lado sem RLS vira um vazamento entre organizações que nenhum teste de aplicação pega.

> **Se houver um caso concreto em que MySQL seja requisito externo** — um cliente que exija, uma integração que só fale MySQL —, ele entra como **integração**, com o dado replicado e o PostgreSQL continuando fonte da verdade. Nunca como segundo banco de escrita. Esse caso precisa de ADR pela §37.

**SQLite** permanece onde a §10.3 já o coloca: cache offline **no dispositivo móvel**, nunca no servidor.

---

## 3. O estado real, medido em 10/08/2026

Antes da tabela, os números, porque a §44 pede evidência e não impressão:

```
TypeScript   84,3% do código vivo    74.240 linhas
SQL          11,1%                    9.807 linhas (fora o ledger de migrations)
Python        4,6%                    4.068 linhas
Go            0,0%                        0 linhas de plataforma
Rust          0,0%                        0 linhas
```

E o bloqueio que governa metade desta tabela:

```
tabelas de fila no banco    0 (de 5)
RPCs de fila no banco       0 (de 8)
tabelas whatsapp_*          existem, com 0 linhas
```

As 25 migrations `stage22_*` estão **no repositório e não no banco**. Enquanto isso for verdade, **nenhum worker pode ser ligado** — não por falta de worker, por falta de fila.

---

## 4. A tabela — o que usar em cada módulo, e quando

Legenda de estado: **implantado** = existe e roda; **parcial** = existe incompleto; **não existe** = só consta na §21.

### 4.1 Módulos que a §21 dá ao Go como principal

| Módulo | Estado hoje | Tecnologia agora | Alvo | **Quando muda** |
| --- | --- | --- | --- | --- |
| **WhatsApp** | implantado em TS (ações, webhook, gateway isolado) | TS | **Go** | **Depois das migrations aplicadas.** O despacho hoje roda dentro do request; move-se para a camada de execução assim que a fila existir no banco. É o primeiro da fila |
| **SINAPI** | implantado em TS, 4 rotas com `maxDuration = 300` | TS | **Go** | Depois do WhatsApp. As quatro rotas de 300 s são o sinal mais forte do inventário; parse de 15 MB medido em **10.035 ms** |
| **CUB** | implantado em TS, cron Vercel, `maxDuration = 60` | TS | **Go** | Junto do SINAPI — mesma natureza de ingestão, já esbarra no teto de 60 s |
| **Assinatura** | implantado em TS (webhook recebe e persiste) | TS | **Go** | Depois da fila. O webhook **não despacha**; o despacho é trabalho da outbox |
| **Documentos** | implantado em TS, 6 geradores síncronos | TS | **Go** | **Só depois de medição.** Geração sob demanda, no request, hoje atende. Migrar antes de medir é o que a §39 proíbe |
| **Backup** | parcial (Shell + Actions) | Shell/YAML | Go/Shell | **Sem prazo.** A §21 aceita `Go/Shell`; o que existe funciona e não há gargalo medido |
| **Conciliação** | **não existe** | — | Go | Quando o Financeiro pedir. É **construção**, não conversão |
| **WMS** | **não existe** | — | Go + PostgreSQL | **Fase 5** da §36 |
| **RFID** | **não existe** | — | Go + MQTT | **Fase 5**. Exige MQTT, que a §11 ainda não introduziu |

### 4.2 Módulos que permanecem em TypeScript

Todos os 25 em que a §21 dá TypeScript como principal — CRM, Clientes, Comercial, Propostas, Contratos, Aditivos, Obras, Diário de obra, Qualidade, FVS/FVM, Compras, Relatórios, Portais, RH, Mobile, Sync offline e demais.

**Não há conversão a fazer, e isso não é omissão.** TypeScript já é 84,3% do código vivo. Onde a §21 cita `Go` como **secundária** nessas linhas (SAC, Propostas, Contratos, Compras, Estoque, Financeiro, Auditoria, Departamento Pessoal, Folha, Orçamento), a leitura correta é: *quando esse módulo precisar de trabalho assíncrono, ele o coloca na camada de execução* — não *reescreva o módulo em Go*.

### 4.3 Python

| Módulo | Estado | Quando |
| --- | --- | --- |
| Formulários de qualidade | implantado, 4.068 linhas | permanece |
| IA, RAG, OCR, Plantas, Quantitativos, Orçamento inteligente, Planejamento | **não existem** | **Fase 4 — Intelligence Plane.** Construção, não conversão |

### 4.4 Rust

**Vedado agora, pela §9.3 do próprio mapa**, que exige cinco pré-requisitos: benchmark do sistema atual, gargalo relevante, protótipo, benchmark comparativo e ganho operacional justificável. Nenhum existe, e os módulos candidatos (BIM/IFC, Plantas) **não foram construídos**. É **Fase 6**.

Introduzir Rust antes disso contraria também a §29 — não adotar por antecipação.

---

## 5. A ordem de execução que decorre da tabela

1. **aplicar as 25 migrations `stage22_*`** — sem isso, nada abaixo acontece;
2. **camada de execução em Go** drenando a outbox (T-43.3, em curso; portões da §24 já verdes);
3. **WhatsApp** sai do request e passa a usar a camada;
4. **SINAPI e CUB** saem das rotas de 300 s e 60 s;
5. **Assinatura** passa a despachar pela outbox;
6. **Documentos** — só depois de medir;
7. Fases 4, 5 e 6 na ordem da §36.

---

## 6. O erro que esta tabela existe para evitar

Ler a §21 como se ela mandasse reescrever tudo que cita Go. Ela cita Go em **23 das 44 linhas**, mas 100% das linhas são polyglotas — 2,30 linguagens por linha. Citar uma linguagem numa linha é dizer que ela é **admissível ali**, não que o módulo será escrito nela.

O segundo erro, mais caro: **converter antes de medir**. A ADR-0001 mediu e achou o contrário do esperado — a CPU é 0,03% de um job de despacho, e trocar Node por Go economizaria **0,41 segundo de CPU por dia** a 100 mil mensagens/dia. A decisão por Go foi tomada pelo proprietário arquitetural, e é legítima pela §43; mas o motivo dela **não é velocidade**, e quem for implementar precisa saber disso para não otimizar o que não é gargalo.
