# VACINA-063 — Rede lógica validada antes da gravação

**Estado:** parcial  
**Detectada em:** PR #38 — loop de QA do Planejamento em 30 de julho de 2026  
**Reserva de numeração:** `VACINA-043` já estava reservada no PR #34; a identificação foi normalizada para 063 na auditoria de regressão de 8 de agosto de 2026.

## Qual foi o problema

O cronograma permitia enviar uma nova dependência validando apenas que a predecessora e a sucessora eram diferentes. Relações duplicadas, atividades de outra obra ou organização e ciclos indiretos como `A → B → C → A` poderiam alcançar a tentativa de persistência.

## Como ocorreu

A interface detectava um ciclo somente depois de carregar o grafo já salvo. A action recebia identificadores do formulário e executava o `INSERT` sem reconstruir a rede vigente, sem confirmar o escopo das duas atividades e sem verificar se já existia caminho da sucessora até a predecessora.

A hierarquia de atividades apresentava risco equivalente: uma tarefa poderia ser colocada sob um descendente e transformar a árvore em ciclo.

## Por que aconteceu

A validação estava centrada no formulário e no caminho feliz. A rede lógica foi tratada como um conjunto de linhas independentes, embora sua validade seja uma propriedade do grafo completo e do escopo organizacional.

## Como foi detectado

A revisão pessimista do módulo Planejamento comparou o comportamento implementado com a expectativa de um editor profissional de cronograma. A leitura de `app/actions/schedule.ts` mostrou que somente a autorrelação direta era bloqueada.

Não havia teste negativo para ciclo indireto, relação duplicada, atividade de outra obra nem ciclo na hierarquia de tarefas.

## Qual foi a solução

Foi criado `lib/planejamento/schedule-validation.ts` com funções puras para:

- validar os quatro tipos de dependência aceitos;
- detectar se uma aresta nova fecha ciclo indireto;
- detectar ciclo na hierarquia de atividades;
- converter falhas de banco em mensagens públicas seguras.

As actions agora:

- confirmam que EAP, atividade superior, predecessora e sucessora pertencem à organização e à obra atuais;
- rejeitam autorrelação, duplicidade e ciclo indireto antes do `INSERT`;
- validam status, prioridade, tipo de dependência, datas e números inteiros;
- não devolvem `message`, `details` ou `hint` do PostgreSQL ao navegador;
- confirmam que atualização e exclusão realmente afetaram o registro esperado.

`tests/schedule-validation.test.ts` protege os cenários negativos.

## Varredura e ocorrências equivalentes

A varredura desta iteração cobriu:

- criação de etapa da EAP;
- criação e edição de atividade;
- atividade superior;
- criação e exclusão de dependência;
- status, prioridade, duração, avanço e defasagem;
- mensagens de erro do banco.

Os fluxos antigos de dependência fora do editor devem continuar usando a mesma action ou serem removidos quando forem encontrados.

## Prevenção automática

- teste de ciclo direto e indireto;
- teste de ciclo hierárquico;
- teste dos tipos aceitos;
- teste de mensagem pública sem conteúdo SQL;
- CI completo com lint, typecheck, testes e build.

## Limitações da prevenção

A proteção atual reconstrói e valida o grafo na camada de aplicação antes da gravação. Duas requisições concorrentes ainda podem observar o mesmo estado anterior e tentar inserir relações incompatíveis ao mesmo tempo.

Para promover esta vacina a `vigente`, a validação e o `INSERT` devem migrar para uma RPC transacional no PostgreSQL, com serialização por obra ou garantia equivalente e teste concorrente de banco.
