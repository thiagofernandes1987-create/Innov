# Matriz de impacto — regressão da main em 2026-08-08

Complementa `AUDITORIA-REGRESSAO-MAIN-2026-08-08.md`.

## Legenda

- **P0 direto**: há inconsistência estática confirmada no próprio caminho do módulo ou em dependência obrigatória.
- **P0 compartilhado**: a página pode estar intacta, mas importa um hub atualmente inconsistente.
- **Regressão funcional**: uma implementação mais segura/moderna foi substituída por versão anterior.
- **Conectado**: rota -> componente/action/lib encontrada; não é dead code por estrutura.
- **Sem overwrite #41**: página principal não foi alterada pelo PR #41; ainda pode sofrer efeitos da casca global ou de dependências compartilhadas.
- **Pendente execução**: precisa de typecheck/build/test/runtime depois da convergência dos P0.

| Módulo | Situação | Impacto | Ação futura |
|---|---|---:|---|
| Dashboard / Launcher | Duas arquiteturas fundidas (`resumos` x `indicadores`) | P0 direto | escolher contrato canônico e convergir |
| CRM | rota de oportunidade voltou à versão antiga; fluxo seguro virou ilha órfã | P1 funcional / P2 dead-code aparente | reconectar `OpportunityForm` e portar `CampoMoeda` |
| Clientes | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Obras | `projects.ts` inconsistente é hub obrigatório | P0 compartilhado | corrigir hub antes do QA de Obras |
| Planejamento | `schedule.ts` fundido + validações removidas | P0 direto / P1 integridade | recompor sobre versão segura do PR #38 |
| Tarefas | motor de cronograma continua usado sem imports | P0 direto | restaurar contrato do motor + manter nomes novos |
| Diário de Obras | página principal intacta, mas rotas contextuais usam `projects.ts` | P0 compartilhado | validar após correção de `projects.ts` |
| Equipes | usa `projects.ts`; também mantém leitura redundante de perfis | P0 compartilhado / P2 | corrigir hub e consolidar resolvedor de nomes |
| Orçamentos | rota principal e actions examinadas estão encadeadas | conectado | preservar e reexecutar validators |
| Propostas | `ProposalForm` continua alcançável e conectado às actions | conectado | preservar e revalidar upload/discount workflow |
| Contratos | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Aditivos | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Assinaturas | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Documentos | página principal intacta; envio/contexto de obra usa `projects.ts` | P0 compartilhado parcial | corrigir hub; preservar fluxo documental |
| Modelos | rota, editor, menu, registro modular e migration de `app_modules` encontrados | conectado | preservar; atualizar inventário QA |
| Qualidade | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Compras e Suprimentos | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Estoque | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Financeiro | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| SAC / Ocorrências | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| WhatsApp | rota/actions/libs/webhook/migrations conectados; merge não homologado | conectado / P1 validação | preservar e repetir Stage 22 + E2E |
| Relatórios | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Auditoria | página principal não foi sobrescrita pelo PR #41 | sem overwrite #41 | validar após casca/P0 |
| Administração / Object Runtime | rotas e actions RPC encontradas | conectado | preservar e revalidar Object Runtime |

## Impacto transversal

### Hub `app/actions/projects.ts`

É importado por rotas de:

- documento novo;
- detalhe de obra;
- diário contextual e detalhe do diário;
- EAP;
- equipes;
- tarefas;
- documentos da obra;
- cronograma.

Enquanto `projects.ts` mantiver referências a símbolos cujos imports foram removidos, essas superfícies devem ser tratadas como impactadas mesmo quando suas páginas não foram alteradas diretamente pelo PR #41.

### Casca visual

`app/module-validation.css` e `app/module-validation-a11y.css` são carregados por último no `RootLayout`. Portanto todos os módulos podem apresentar regressão visual mesmo quando seu código funcional não foi sobrescrito.

## Dead code: regra desta auditoria

Não excluir nada antes da análise de alcançabilidade. Um conjunto de arquivos pode parecer usado porque seus membros importam uns aos outros e, ainda assim, estar desconectado de todas as rotas. O caso confirmado é:

`components/relationship/opportunity-form.tsx` -> `app/actions/crm-opportunities.ts`

sem uma rota atual importando `OpportunityForm`.

O script `scripts/auditar-alcancabilidade.mjs`, criado apenas na branch de auditoria, foi adicionado para detectar esse padrão no próximo ambiente em que o repositório puder ser executado.
