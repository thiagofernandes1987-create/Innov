# Etapa 20 — E2E de concorrência real do estoque

## Estado

**Concluído e aprovado no Supabase de homologação.**  
Workflow: `Stage 20 Inventory Concurrency E2E`  
Run: `29889168656`  
Job: `88826051387`  
Artefato: `8517620520`  
Commit testado: `616a93bab01b09c91510b1de521b2e6eeb5b7363`

## Objetivo

Comprovar que duas conexões autenticadas independentes, representando o mesmo operador interno autorizado, não conseguem consumir simultaneamente quantidade superior ao saldo disponível da mesma posição de estoque.

## Cenário

```text
saldo inicial: 10
movimento A: saída de 6
movimento B: saída de 6
postagens: simultâneas por Promise.all
resultado esperado: uma postagem e uma rejeição
saldo esperado após a disputa: 4
saldo esperado após cleanup: 0
```

A soma das duas saídas seria `12`, maior que o saldo `10`. Sem serialização correta, ambas poderiam ser publicadas e produzir saldo `-2`.

## Preparação

- duas instâncias independentes do cliente Supabase;
- login real de `admin@innov.eng.br` em ambas;
- membership `SUPER_ADMIN` na organização de homologação;
- fixture permanente identificada pelo código `E2E20-CONCURRENCY`;
- depósito padrão com `allows_negative_stock=false`;
- saldo da fixture normalizado antes da execução;
- entrada inicial criada pela RPC `create_inventory_movement`;
- custos e estados sensíveis preservados atrás das fronteiras de domínio.

## Execução

1. login paralelo das duas sessões;
2. entrada de 10 unidades publicada;
3. dois movimentos `ISSUE` de `-6` criados em estado `DRAFT`;
4. duas chamadas a `post_inventory_movement` executadas em paralelo;
5. consulta do saldo e dos estados finais;
6. reversão da saída publicada;
7. exclusão do rascunho rejeitado;
8. reversão da entrada inicial;
9. confirmação de saldo zero.

## Resultado

```text
status: passed
cleanup: passed
```

### Serialização

- movimento publicado: `77e0a350-ed0d-4860-a970-25a34f43b1ae`;
- movimento rejeitado: `58a24e98-f1a8-43ae-aaef-5cd225910aa9`;
- motivo normalizado: `insufficient_available_stock`;
- durações observadas: `132 ms` e `74 ms`.

A ordem de conclusão não define a ordem de aquisição do lock. O contrato comprovado é que apenas uma transação foi publicada.

### Saldo após a disputa

```text
physical: 4
reserved: 0
available: 4
```

Estados:

```text
DRAFT
POSTED
```

### Cleanup

Foram criadas reversões append-only para:

- saída publicada;
- entrada inicial.

O movimento rejeitado, ainda em `DRAFT`, foi removido com suas linhas.

Saldo final:

```text
physical: 0
reserved: 0
available: 0
```

Nenhum erro de cleanup foi registrado.

## Causa da primeira execução bloqueada

A primeira execução tentou definir `reference_unit_cost` diretamente na fixture e foi bloqueada pelo guard sensível:

```text
Permissão sensível necessária para definir custo de referência.
```

A proteção não foi relaxada. O campo foi removido da criação direta e o custo da linha continuou sendo informado pela RPC autorizada de movimento.

Esse aprendizado originou a `VACINA-013 — Fixtures respeitam fronteiras de dados sensíveis`.

## Arquivos

```text
scripts/run-stage20-inventory-concurrency-e2e.mjs
.github/workflows/stage20-inventory-concurrency-e2e.yml
stage20-inventory-concurrency-report.json  # artefato do workflow
```

## Segurança

- secrets validados antes da instalação;
- relatório inicial sempre criado;
- Service Role usada somente para setup, inspeção e cleanup;
- operações funcionais usam sessão autenticada;
- nenhuma credencial incluída no artefato;
- custo sensível não é escrito diretamente;
- saldo negativo permanece bloqueado;
- movimentos publicados permanecem append-only;
- workflow restrito ao ambiente `homologation`;
- execuções duplicadas por `push` e `pull_request` foram eliminadas.

## Vacinas aplicadas

- `VACINA-003` — ledger de migrations;
- `VACINA-004` — privilégios de RPC;
- `VACINA-005` — estados protegidos;
- `VACINA-006` — runtime das actions;
- `VACINA-007` — scanner de secrets;
- `VACINA-008` — instalação consistente;
- `VACINA-009` — pré-requisitos e artefato;
- `VACINA-010` — serialização JSON;
- `VACINA-012` — estado canônico;
- `VACINA-013` — fixtures e fronteiras sensíveis.

## Critério de conclusão

- [x] duas sessões independentes autenticadas;
- [x] mesma organização, depósito, localização, item e lote;
- [x] duas saídas concorrentes excedem o saldo quando somadas;
- [x] exatamente uma postagem aprovada;
- [x] exatamente uma postagem rejeitada;
- [x] rejeição por estoque disponível insuficiente;
- [x] saldo físico e disponível não negativos;
- [x] estado final `POSTED` + `DRAFT`;
- [x] saída publicada revertida;
- [x] rascunho rejeitado removido;
- [x] entrada inicial revertida;
- [x] saldo final zero;
- [x] relatório preservado;
- [x] nenhum secret exposto;
- [x] workflow verde.

## Limitações

O teste comprova concorrência real via duas requisições HTTP e duas transações PostgreSQL independentes. Ele não substitui teste de carga prolongado, chaos engineering ou medição de throughput, que permanecem na Etapa 20.
