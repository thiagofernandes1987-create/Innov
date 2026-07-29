# Índice de campanhas QA — S-23 Fundação de interface

**Data:** 29 de julho de 2026  
**Branch canônica:** `main`  
**Estado:** sprint em andamento

## Microblocos concluídos

### PR #26 — Documentos e Planejamento

- coleção global de Documentos sem relação ambígua;
- mensagens de leitura seguras;
- Planejamento em lista, cartões e calendário sobre o mesmo conjunto de dados;
- replay limpo, orçamento, SINAPI e auditoria interna reconciliados;
- taxas CUB normalizadas.

Evidência: `docs/CAMPANHA-QA-S23-DOCUMENTOS-PLANEJAMENTO-2026-07-29.md`.

### PR #27 — Estados de falha das coleções de obra

- carteira de Obras;
- Tarefas;
- Cronograma;
- Equipes e recursos;
- vazio verdadeiro separado de indisponibilidade;
- falha do projeto separada de `404` verdadeiro;
- formulários dependentes bloqueados quando os dados auxiliares não são confiáveis.

Evidência: `docs/CAMPANHA-QA-S23-ESTADOS-DE-FALHA-COLECOES-2026-07-29.md`.

### PR #28 — Diário, EAP e Documentos internos

- Diário preserva cadastro independente em falha da coleção;
- EAP não calcula peso nem monta hierarquia sobre dados ausentes;
- Documentos e versões são consultados separadamente;
- URLs assinadas do storage possuem estado independente;
- logger seguro aceita banco e storage sem registrar mensagens sensíveis.

Evidência: `docs/CAMPANHA-QA-S23-DIARIO-EAP-DOCUMENTOS-INTERNOS-2026-07-29.md`.

## Contrato preventivo acumulado

`tests/interface-foundation-contract.test.ts` protege:

- coleção global de Documentos;
- cinco visualizações do pipeline CRM;
- três visualizações do Planejamento;
- sete coleções ligadas à execução de obra;
- Gantt e dependências;
- orçamento operável;
- erros classificados de login;
- ícone da aplicação.

## Próxima fronteira

Coleções globais de execução:

- Tarefas;
- Diário;
- Equipes;
- Relatórios.

Depois disso:

- criação de obra e erros de ações;
- coleções comerciais;
- administração;
- reconciliação final da S-23.

Equipes avançadas, competências, jornadas, produtividade e alocação de recursos permanecem bloqueadas até a conclusão documental e técnica da S-23.
