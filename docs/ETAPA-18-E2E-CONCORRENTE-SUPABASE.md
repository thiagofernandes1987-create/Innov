# Etapa 18 — E2E concorrente no Supabase

## Estado

**Concluída, homologada e incorporada à `main`.**  
Branch histórica: `test/etapa-18-e2e-concorrente-supabase`  
PR: `#18`, mesclado em 22 de julho de 2026  
Commit funcional aprovado: `4a274ff`

## Objetivo

Validar duas sessões autenticadas independentes acessando simultaneamente o mesmo domínio no Supabase:

- administrador interno com membership organizacional;
- cliente do portal vinculado pela tabela `clients`;
- RLS e capacidades diferentes;
- consistência do chamado SAC sob operações concorrentes.

## Ambiente

- ambiente protegido GitHub: `homologation`;
- contas provisionadas de forma idempotente;
- senhas somente em secrets;
- Service Role utilizada apenas para preparação, inspeção segura e limpeza;
- operações funcionais executadas com publishable key e sessão real do respectivo usuário.

## Fluxo executado

```text
login paralelo
→ cliente abre chamado idempotente
→ administrador e cliente leem simultaneamente
→ mensagem interna e mensagem pública em paralelo
→ transição para TRIAGE e nova mensagem do cliente em paralelo
→ tentativa direta de alterar status por ambos
→ leitura final simultânea
→ verificação de RLS, visibilidade e consistência
→ cleanup best-effort auditável
```

O script usa `Promise.all` nas operações concorrentes.

## Verificações aprovadas

- identidades diferentes;
- administrador pertence à organização do cliente;
- cliente abre somente chamado próprio;
- repetição com a mesma chave retorna o mesmo chamado;
- contexto interno é verdadeiro somente para o administrador;
- mensagem interna não aparece ao cliente;
- mensagens públicas aparecem para ambos;
- eventos internos não aparecem ao cliente;
- administrador e cliente observam o mesmo status final;
- alteração direta de `sac_tickets.status` é bloqueada para ambos;
- consultas diretas respeitam RLS;
- relatório JSON não contém secrets;
- cleanup remove anexos e atividades temporários;
- mensagem, evento e ticket são preservados quando o banco informa histórico imutável.

## Arquivos

```text
scripts/run-stage18-concurrent-e2e.mjs
.github/workflows/stage18-concurrent-e2e.yml
stage18-concurrent-e2e-report.json   # somente artefato do job
```

## Evidência final

```text
workflow: Stage 18 Concurrent E2E
run id: 29883182240
job id: 88808257896
status: success
status do relatório: passed
cleanup: passed
artifact id: 8515542770
```

O cleanup registra históricos preservados em `cleanupSkipped` com razão `immutable_history`, sem transformar uma restrição append-only legítima em falha do job. Erros inesperados continuam sendo relançados.

## Vacinas aplicadas

- `VACINA-001` — relações Supabase variáveis;
- `VACINA-002` — validadores semânticos;
- `VACINA-003` — ledger de migrations;
- `VACINA-004` — privilégio mínimo de RPCs;
- `VACINA-005` — workflow protegido;
- `VACINA-006` — runtimes Node.js 24 nas GitHub Actions;
- `VACINA-007` — scanner de secrets com placeholders;
- `VACINA-008` — instalação consistente entre CI e homologação;
- `VACINA-009` — pré-requisitos e relatório sempre disponível;
- `VACINA-010` — JSON gerado por serializador;
- `VACINA-012` — estado pós-merge coerente com a documentação canônica.

## Segurança

- secrets não são impressos;
- relatório não contém senha, token ou Service Role;
- cliente não recebe eventos ou mensagens internas;
- cleanup é executado em `finally`, inclusive em falha funcional;
- workflow usa `concurrency` sem cancelamento para evitar limpezas simultâneas;
- PR externo não executa o job protegido;
- operações funcionais não usam Service Role.

## Critério de conclusão

- [x] CI comum verde no commit funcional final;
- [x] cinco secrets configurados no ambiente `homologation`;
- [x] provisionamento idempotente verde;
- [x] login paralelo verde;
- [x] operações concorrentes verdes;
- [x] RLS e visibilidade verdes;
- [x] bloqueios negativos verdes;
- [x] cleanup verde;
- [x] relatório funcional final baixado e revisado;
- [x] PR mesclado e conteúdo incorporado à `main`.

## Limitações transferidas à Etapa 20

O teste envia requisições HTTP concorrentes reais a partir do mesmo runner, mas não controla o instante exato em que cada transação entra no PostgreSQL. Testes de carga, chaos e concorrência de estoque com múltiplas conexões pertencem à Etapa 20.
