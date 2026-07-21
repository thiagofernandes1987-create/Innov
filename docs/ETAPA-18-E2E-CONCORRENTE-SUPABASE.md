# Etapa 18 — E2E concorrente no Supabase

## Estado

**Em execução na homologação.**  
Branch: `test/etapa-18-e2e-concorrente-supabase`

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
- todas as operações funcionais executadas com publishable key e sessão real do respectivo usuário.

## Fluxo

```text
login paralelo
→ cliente abre chamado idempotente
→ administrador e cliente leem simultaneamente
→ mensagem interna e mensagem pública em paralelo
→ transição para TRIAGE e nova mensagem do cliente em paralelo
→ tentativa direta de alterar status por ambos
→ leitura final simultânea
→ verificação de RLS, visibilidade e consistência
→ limpeza garantida
```

## Verificações

- identidades diferentes;
- administrador pertence à organização do cliente;
- cliente consegue abrir somente chamado próprio;
- repetição com mesma chave retorna o mesmo chamado;
- contexto interno é `true` somente para o administrador;
- mensagem `INTERNAL` não aparece ao cliente;
- mensagens `CLIENT` aparecem para ambos;
- eventos internos não aparecem ao cliente;
- administrador e cliente observam o mesmo status final;
- alteração direta de `sac_tickets.status` é bloqueada para ambos;
- consultas diretas respeitam RLS;
- limpeza remove todos os dados temporários;
- relatório JSON é preservado como artefato por 14 dias.

## Arquivos

```text
scripts/run-stage18-concurrent-e2e.mjs
.github/workflows/stage18-concurrent-e2e.yml
stage18-concurrent-e2e-report.json   # somente artefato do job
```

## Vacinas aplicadas

- `VACINA-001` — relações Supabase variáveis;
- `VACINA-002` — validadores semânticos;
- `VACINA-003` — ledger de migrations;
- `VACINA-004` — privilégio mínimo de RPCs;
- `VACINA-005` — workflow protegido;
- `VACINA-006` — runtimes Node.js 24 nas GitHub Actions.

## Segurança

- secrets não são impressos;
- relatório não contém senha, token ou Service Role;
- cliente não recebe eventos ou mensagens internas;
- cleanup é executado em `finally`, inclusive em falha;
- workflow usa `concurrency` sem cancelamento para evitar limpeza concorrente de duas execuções.

## Critério de conclusão

- [ ] CI comum verde;
- [ ] provisionamento idempotente verde;
- [ ] login paralelo verde;
- [ ] operações concorrentes verdes;
- [ ] RLS e visibilidade verdes;
- [ ] bloqueios negativos verdes;
- [ ] cleanup verde;
- [ ] relatório baixado e revisado;
- [ ] limitações registradas;
- [ ] PR pronto para revisão.

## Limitações

O teste usa `Promise.all`, portanto envia requisições HTTP concorrentes reais a partir do mesmo runner, mas não controla o instante exato em que cada transação entra no PostgreSQL. A evidência de serialização vem do resultado final consistente, dos locks/guards do banco e da ausência de vazamento entre sessões.
