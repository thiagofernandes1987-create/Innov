# VACINA-005 — Estados críticos alterados somente por RPC de domínio

## Sintoma

Status, responsável, datas de resolução ou campos de conversão podem ser alterados diretamente por `UPDATE`, contornando transições, auditoria ou regras de negócio.

Também foi observado que uma variável transacional usada como bypass permanecia ativa depois de uma RPC e poderia afetar outra operação na mesma transação.

## Causa raiz

- privilégios amplos de tabela/coluna;
- guard dependente de variável de sessão controlável ou persistente na transação;
- regra de workflow aplicada somente na interface;
- ausência de teste negativo após executar outra RPC na mesma sessão.

## Vacina

- revogar `INSERT/UPDATE/DELETE` amplo de tabelas com workflow;
- conceder somente colunas editoriais não críticas;
- alterar estado apenas por RPC transacional autorizada;
- guard baseado em identidade SQL (`current_user`) e não em flag de sessão;
- RPC valida transição, justificativa, escopo, ator e auditoria;
- teste negativo tenta alteração direta depois de outras RPCs na mesma transação.

## Aplicação transversal

Aplicada em:

- leads;
- oportunidades;
- chamados SAC;
- movimentos de estoque;
- inventários físicos;
- contratos, documentos e snapshots imutáveis.

## Teste preventivo

- migration `stage18_workflow_privilege_hardening`;
- testes transacionais com rollback;
- validadores de etapa exigem guards e revogações;
- E2E deve confirmar que ações simultâneas não permitem salto de estado.

## Critério de encerramento

- alteração direta do estado falha;
- RPC válida executa a transição permitida;
- evento de auditoria é criado;
- outra RPC executada anteriormente não libera bypass residual;
- cliente e usuário interno respeitam visibilidades e permissões distintas.
