# Campanha QA — S-23 Estados de falha das coleções

**Data:** 29 de julho de 2026  
**Branch:** `fix/s23-safe-collection-errors`  
**PR:** `#27`  
**Estado:** microbloco concluído; sprint S-23 continua em andamento

## 1. Escopo

Este microbloco revisou quatro coleções críticas da execução de obra:

- carteira de Obras;
- Tarefas;
- Cronograma;
- Equipes e recursos.

O objetivo foi impedir três falhas de representação:

1. mensagem técnica de SQL/PostgREST exposta ao usuário;
2. indisponibilidade do projeto convertida em `404`;
3. consulta com erro apresentada como lista vazia.

## 2. Regra implantada

```text
consulta confirmada e sem registros
→ estado vazio verdadeiro

consulta do projeto sem erro e sem registro
→ 404 verdadeiro

consulta com erro
→ mensagem estável de domínio
→ log com contexto e código estável
→ área dependente indisponível
→ nenhuma conclusão baseada em coleção parcial
```

## 3. Carteira de Obras

- substituição de `error.message` por mensagem segura;
- erro registrado como `projects.collection`;
- estado “Nenhuma obra cadastrada” aparece somente quando a consulta foi bem-sucedida;
- texto de entrada passou a reconhecer obra por contrato ou entrada independente.

## 4. Tarefas

As fontes foram separadas em projeto, tarefas, EAP e membros.

- falha do projeto é tratada antes de `notFound()`;
- falha de tarefas oculta o Kanban, evitando colunas vazias falsas;
- falha de EAP ou membros bloqueia o formulário de nova tarefa;
- dados confirmados permanecem visíveis quando a falha é parcial;
- cada fonte possui contexto próprio no log.

## 5. Cronograma

As fontes foram separadas em projeto, tarefas, dependências, marcos e baselines.

- falha do projeto não vira `404`;
- Gantt e formulário de dependências exigem tarefas e relações carregadas;
- o indicador “sem atraso” não aparece quando o cronograma está indisponível;
- marcos e baselines mantêm estados independentes;
- baseline não pode ser congelada com cronograma parcial.

## 6. Equipes e recursos

As fontes foram separadas em projeto, equipes, recursos e membros autorizados.

- falha de equipes não produz cartão “nenhuma equipe”; 
- falha de recursos não produz tabela vazia nem custos falsamente ausentes;
- falha de membros bloqueia a definição de líder;
- cadastro de recurso permanece disponível porque não depende da lista de membros;
- valores monetários continuam formatados em `pt-BR` e `BRL`.

## 7. Cenários

| Cenário | Resultado esperado |
|---|---|
| consulta normal | coleção e formulários funcionais |
| consulta bem-sucedida sem registros | estado vazio verdadeiro |
| falha total do projeto | mensagem segura, navegação preservada, sem 404 falso |
| falha parcial da coleção | apenas área dependente indisponível |
| falha de dados auxiliares | formulário dependente bloqueado |
| erro da ação de domínio | mensagem da ação preservada no retorno controlado |

## 8. Prevenção

`tests/interface-foundation-contract.test.ts` agora verifica que:

- as quatro páginas não contêm `error.message`;
- todas usam `DATA_LOAD_ERROR_MESSAGE` e `reportDataAccessError`;
- a falha do projeto é verificada antes de `notFound()`;
- o vazio da carteira depende de `!loadFailed`;
- Kanban, Gantt, equipes e recursos têm guardas explícitos de carregamento.

## 9. Evidências executadas

GitHub Actions `1592` aprovou:

- preflight e documentação canônica;
- replay e testes de banco;
- cronograma, pipeline, eventos, orçamento e documentos comerciais;
- lint;
- typecheck;
- testes TypeScript;
- testes Python;
- build Next.js.

Preview Vercel `dpl_DUzUaG1ay28zCJupNdqLhuKmvMyV`: `READY`.

## 10. Limites

Este microbloco não declara a classe inteira resolvida. Permanecem para o próximo ciclo:

- Diário de obra;
- EAP;
- Documentos internos do projeto;
- tela de criação de obra e demais coleções antigas;
- estados de carregamento e recuperação específicos por aplicativo.

Equipes, competências, jornadas, produtividade e alocação avançada continuam bloqueadas até a reconciliação da sprint S-23.
