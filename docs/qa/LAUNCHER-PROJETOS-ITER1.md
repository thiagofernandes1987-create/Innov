# QA visual — launcher e Projetos — iteração 1

**Data:** 30 de julho de 2026  
**Branch:** `qa/launcher-projetos-iter1`  
**PR:** #36  
**Referência visual:** launcher com cartões operacionais e Projetos em Kanban, conforme imagens anexadas à conversa de origem.

## Personas

| Alvo | Persona exigida | Rota |
|---|---|---|
| Launcher | administrador | `/app` |
| Projetos | gestor de obras, com avaliação complementar do planejador | `/app/pipeline/projeto` |

## Achados confirmados

| Problema | Localização | Severidade | Impacto na persona | Situação |
|---|---|---:|---|---|
| Filtros e menus abaixo de 44px | casca e faixa do launcher | alta | toque impreciso em celular e tablet | corrigido em `module-validation-a11y.css` |
| Painel de personalização sem limite seguro | launcher em tela estreita | alta | painel pode sair da viewport | corrigido |
| Amostra usa contrato antigo do `Launcher` | `/amostra-launcher` | bloqueante | build do preview não conclui | corrigido com `LauncherSummaryMap` vazio, sem KPI inventado |
| Validador usa identificador reservado `module` | `scripts/validate-module-qa.mjs` | bloqueante | VACINA-011 reprova o CI | corrigido com `moduleEntry` |
| Matriz documental diverge do requisito atual | protocolo e inventário de QA | alta | captura aprova larguras diferentes das solicitadas | corrigido para 375px, 768px e 1280px full-page |
| Credenciais de persona ausentes no Actions | workflow de QA | bloqueante | não é possível provar que a persona real conclui o fluxo | aberto |
| Segredo de bypass Vercel ausente | workflow de QA | bloqueante | preview protegido pode impedir o navegador automatizado | aberto |

## Execuções

1. Preview inicial falhou no typecheck porque `/amostra-launcher` ainda enviava a prop removida `demonstracao`.
2. Após a correção, o preview `bd36ab83` chegou a `READY`.
3. O gate Playwright iniciou, mas encerrou antes da navegação porque `DEMO_ADMIN_PASSWORD` estava vazio.
4. O CI detectou uso de `module` no validador; a correção aplicou a VACINA-011.
5. O runner genérico e a matriz automática foram atualizados para 375px, 768px e 1280px, temas claro e escuro.

## Estado

`dashboard` e `obras` permanecem `em_correcao`. Não há captura aprovada, simulação válida de persona, revisão visual final ou teste pessimista de integração concluído.
