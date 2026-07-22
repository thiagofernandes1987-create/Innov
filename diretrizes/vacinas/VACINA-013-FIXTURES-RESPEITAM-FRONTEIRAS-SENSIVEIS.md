# VACINA-013 — Fixtures respeitam fronteiras de dados sensíveis

## Sintoma

Um E2E ou script de homologação usa Service Role para criar fixture e tenta preencher diretamente uma coluna sensível protegida, como custo de referência. O banco bloqueia corretamente a preparação antes que o cenário funcional seja executado.

Exemplo observado na Etapa 20:

```text
Fixture de item: Permissão sensível necessária para definir custo de referência.
```

## Causa raiz

- confusão entre privilégio técnico de provisionamento e autorização de domínio;
- fixture reproduzindo um objeto completo sem separar campos necessários dos sensíveis;
- uso de `upsert` direto em vez da RPC autorizada para valores econômicos;
- pressuposto incorreto de que Service Role deve contornar invariantes e guards;
- ausência de validação preventiva nos scripts E2E.

## Vacina

- Service Role prepara identidade, escopo e fixture mínima, mas não desativa guards de domínio;
- colunas sensíveis não são definidas diretamente por scripts de teste;
- custos, estados protegidos e transições usam RPC autorizada;
- fixtures devem possuir apenas os campos estritamente necessários ao cenário;
- valores sensíveis em linhas de movimento passam pela RPC `create_inventory_movement`;
- falhas de proteção são tratadas como evidência de segurança ativa, não como motivo para relaxar triggers ou privilégios;
- o relatório nunca inclui segredo, token ou valor sensível desnecessário.

## Aplicação transversal

Aplicada inicialmente em:

- `scripts/run-stage20-inventory-concurrency-e2e.mjs`;
- futuras fixtures de estoque, financeiro, orçamento, assinatura e relatórios;
- scripts de carga e backup que necessitem dados artificiais;
- workers ou ferramentas de homologação que usem Service Role.

## Padrões proibidos

Em fixtures executadas com Service Role:

```js
service.from("inventory_items").upsert({ reference_unit_cost: 1 })
service.from("...").update({ status: "PROTECTED_STATE" })
service.from("...").update({ sensitive_value: value })
```

quando existir RPC, capacidade ou guard específico para o contrato.

Também é proibido:

- remover o trigger para o teste passar;
- conceder privilégio amplo à Service Role sem necessidade operacional;
- registrar o valor sensível no artefato;
- usar fixture permanente em operação real.

## Teste preventivo

`pnpm validate:vaccines` deve:

- exigir este documento no catálogo;
- verificar que o E2E da Etapa 20 não contém `reference_unit_cost` na preparação direta da fixture;
- confirmar que `unitCost` aparece somente no payload da RPC de movimento;
- exigir `create_inventory_movement` e `post_inventory_movement` no cenário;
- impedir alterações diretas de status protegido no setup;
- manter a proteção sensível ativa nas migrations da Etapa 17.

## Critério de encerramento

- fixture criada sem escrever custo de referência diretamente;
- entrada e saída passam pela RPC autorizada;
- duas sessões executam a disputa real;
- exatamente uma saída é publicada;
- saldo nunca fica negativo;
- cleanup restaura saldo zero;
- guard de custo sensível permanece ativo;
- relatório não contém credenciais ou valores protegidos desnecessários;
- CI e homologação ficam verdes.
