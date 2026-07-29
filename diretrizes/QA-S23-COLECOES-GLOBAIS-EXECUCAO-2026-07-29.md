# QA S-23 — Coleções globais de execução

**Data:** 29 de julho de 2026  
**Sprint:** S-23 — Fundação de interface  
**PR:** #29 — `fix: protege coleções globais de execução`  
**Branch:** `fix/s23-safe-global-execution-collections`

## 1. Escopo

Esta campanha cobre as coleções globais que agregam dados de várias obras:

- Tarefas;
- Diário de obras;
- Equipes e recursos;
- Indicadores Executivos de Relatórios.

O objetivo é impedir que uma falha de leitura seja apresentada como coleção vazia, KPI igual a zero, ausência de pendências ou relatório sem dados.

## 2. Contrato de estado

As telas passam a distinguir explicitamente:

| Situação | Resultado esperado |
|---|---|
| consulta bem-sucedida com registros | dados, KPIs e ações dependentes disponíveis |
| consulta bem-sucedida sem registros | estado vazio verdadeiro |
| falha total | mensagem estável, log seguro e nenhum KPI derivado |
| falha parcial | somente dados confirmados permanecem visíveis |
| relatório global indisponível | sem exportação, snapshot, métricas ou vazio calculado |
| relatório da obra indisponível | filtro global preservado; indicadores filtrados bloqueados |

## 3. Correções verificadas

### 3.1 Tarefas globais

- remove exibição de `error.message`;
- registra somente contexto e identificador estável do provedor;
- não calcula total aberto, tarefas próprias, atrasadas ou bloqueadas sobre resposta falha;
- não mostra “Nenhuma tarefa cadastrada” quando a consulta falha.

### 3.2 Diário global

- remove exibição de `error.message`;
- não zera registros, aprovações e ocorrências em caso de falha;
- estado vazio existe somente dentro do caminho de sucesso;
- indisponibilidade recebe estado próprio.

### 3.3 Equipes globais

- consulta de equipes e consulta de recursos possuem erros independentes;
- falha de recursos deixa de ser ignorada;
- KPI de equipes pode permanecer visível quando confirmado;
- KPIs de mão de obra, equipamentos e recursos desaparecem quando a fonte correspondente falha;
- equipes confirmadas continuam acessíveis em falha parcial de recursos.

### 3.4 Relatórios

- remove `throw new Error(error.message)`;
- falha da carteira global não produz métricas, exportação, snapshot ou estado vazio enganoso;
- falha somente da obra selecionada preserva a lista de obras autorizadas e o filtro;
- dados globais não são reutilizados como se fossem dados da obra filtrada;
- falhas global e filtrada possuem contextos de log separados.

## 4. Prevenção automatizada

O arquivo `tests/interface-foundation-contract.test.ts` verifica:

- ausência de `error.message` nas quatro telas;
- presença da mensagem estável e do logger seguro;
- KPIs e estados vazios condicionados ao sucesso;
- tratamento separado de equipes e recursos;
- ausência de `throw new Error` no dashboard;
- tratamento separado da carteira global e da obra selecionada.

## 5. Evidências de execução

### GitHub Actions

- workflow: `CI`;
- execução: `#1614`;
- run ID: `30489571451`;
- preflight: aprovado;
- replay e testes de banco: aprovados;
- lint: aprovado;
- TypeScript: aprovado;
- testes TypeScript: aprovados;
- testes Python: aprovados;
- build Next.js: aprovado.

### Vercel

- deployment: `dpl_CmQWDtCPYmcUDQxPtizXrQ5ynAGr`;
- commit validado: `44a259c07d9a2b7e83ff0f550665cbf5aee8ac48`;
- ambiente: preview;
- estado: `READY`;
- alias de branch criado sem erro.

## 6. Cenários exercitados pelo contrato

1. coleção com dados;
2. coleção vazia após sucesso;
3. falha total de tarefas;
4. falha total do diário;
5. falha de equipes;
6. falha apenas de recursos;
7. falha da carteira de relatórios;
8. falha apenas do relatório da obra selecionada;
9. relatório sem obras autorizadas após resposta válida;
10. acesso financeiro restrito com indicadores operacionais preservados.

## 7. Limites declarados

Esta campanha não declara como resolvidos:

- mensagens técnicas produzidas por ações antigas em páginas secundárias de Relatórios;
- criação de obra e mensagens de suas ações;
- coleções comerciais;
- coleções administrativas;
- promoção automática da `main` para produção na Vercel.

Esses pontos permanecem no backlog da S-23 e devem seguir o mesmo ciclo: diagnóstico, correção mínima, teste preventivo, CI, preview, evidência, merge e verificação pós-merge.
