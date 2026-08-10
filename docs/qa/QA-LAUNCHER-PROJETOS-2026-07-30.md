# QA visual — Launcher e Projetos

**Data:** 30 de julho de 2026  
**PR:** #34  
**Branch:** `fix/module-validation-loop-20260730`  
**Referências:** imagens anexadas pelo responsável — launcher operacional e Projetos em Kanban.

## Estado executivo

| Superfície | Estado | Motivo |
|---|---|---|
| Launcher — fixture visual | `PARTIAL` | seis capturas reais foram produzidas e a segunda rodada passou nos detectores; o último ajuste de contraste ainda aguarda novo deployment |
| Launcher — persona administrador | `BLOCKED_EXTERNAL` | `QA_PERSONAS_JSON` e `DEMO_ADMIN_PASSWORD` não estão disponíveis no GitHub Actions |
| Projetos — persona gestor de obras | `BLOCKED_EXTERNAL` | credencial da persona não está disponível; nenhuma captura autenticada pode ser considerada válida |
| Publicação da iteração 3 | `BLOCKED_EXTERNAL` | Vercel retornou `build-rate-limit` para o commit `d4ecfa6a40fe81ef371a222bdc5949e3259d8a77` |

Nenhuma das duas superfícies está aprovada no inventário modular.

## Iteração 1 — reprodução

### Achados

| Problema | Localização | Severidade | Impacto na persona |
|---|---|---:|---|
| CRM não ocupava 2 × 2 e deixava uma coluna vazia abaixo | grid desktop do launcher | alta | a hierarquia não correspondia à referência e desperdiçava área útil |
| descrição e itens recentes quase invisíveis no tema claro | cartões e destaque | alta | leitura exigia esforço e podia parecer conteúdo ausente |
| `Acessar` tinha 40px | destaque | alta | alvo de toque abaixo do contrato de 44px |
| `Ver todas no aplicativo` tinha 18px | destaque | alta | ação secundária difícil de tocar |
| controles de tema tinham 36px de largura | barra superior | alta | toque impreciso em telas sensíveis ao toque |

### Evidência

- workflow: `QA Fixture Pública do Launcher`, run `30538600266`;
- artefato: `8757747245`;
- seis imagens: 375px, 768px e 1280px, temas claro e escuro;
- sem erro de console, page error ou resposta 5xx;
- reprovação automática por alvos abaixo de 44px.

## Iteração 2 — grade, contraste e alvos

### Correções

- CRM passou a ocupar duas colunas e duas linhas no desktop;
- cartões passaram a participar do mesmo fluxo de grade, preenchendo toda a largura após o destaque;
- primeiro plano passou a usar tokens compatíveis com claro e escuro;
- `Acessar`, `Ver todas` e alternador de tema passaram a respeitar 44px;
- responsividade preservada em uma coluna no mobile e duas no tablet.

### Evidência

- deployment imutável: `innov-olkol5nx4-apex-method.vercel.app`;
- commit publicado: `73c4dd442740839a2c748e7ae24b74e66599fa86`;
- workflow: `QA Fixture Pública do Launcher`, run `30539258947`;
- artefato: `8758001746`;
- conclusão do job: `success`;
- seis cenários sem overflow, alvo abaixo de 44px, console error/warning, page error ou 5xx.

### Autocrítica visual

A análise manual confirmou a grade e a legibilidade dos cartões, mas encontrou um novo defeito no tema claro em 768px: filtros inativos e `Personalizar` usavam primeiro plano claro fixo e pareciam desaparecer.

## Iteração 3 — controles do tema claro

### Correção

Commit `d4ecfa6a40fe81ef371a222bdc5949e3259d8a77`:

- filtros inativos e `Personalizar` usam `var(--muted)`;
- hover de `Personalizar` usa `var(--text)` e `var(--surface-muted)`;
- grupo do título foi estabilizado entre 601px e 1119px.

### Bloqueio

O status Vercel do commit retornou falha com alvo `upgradeToPro=build-rate-limit`. Portanto:

- o código foi commitado;
- o CI continua executando;
- não existe deployment imutável dessa iteração;
- não existe captura válida da iteração 3;
- a fixture não pode ser declarada visualmente aprovada.

## Personas e credenciais

Os workflows de persona produziram relatórios de bloqueio, não falsos screenshots:

- administrador no launcher: credencial ausente;
- gestor de obras em Projetos: credencial ausente;
- `VERCEL_AUTOMATION_BYPASS_SECRET` também não está disponível.

O runner grava `report.json` mesmo nesses casos, preservando `BLOCKED_EXTERNAL` como evidência.

## Logs

- Vercel runtime errors para `/amostra-launcher`, `/app` e `/app/pipeline/projeto`: nenhum cluster encontrado na consulta realizada;
- Stage 18 Concurrent E2E: sucesso na iteração 3;
- Stage 20 File Security E2E: sucesso na iteração 3;
- CI principal: em execução no momento deste registro.

## Vacinas aplicadas

Nenhuma vacina nova foi criada, pois as causas já estavam catalogadas:

- `VACINA-019` — responsividade e alvos de toque;
- `VACINA-027` — correção visual exige comparação com referência;
- `VACINA-031` — primeiro plano e superfície devem usar tokens coerentes;
- `VACINA-062` — correção visual só fecha com captura do preview.

O limite de builds da Vercel não recebeu vacina porque a causa ainda não foi resolvida; registrar solução antes de existir solução reproduzível seria inventar evidência.

## Próximo portão

1. aguardar liberação do limite de build da Vercel;
2. publicar o commit `d4ecfa6a40fe81ef371a222bdc5949e3259d8a77`;
3. repetir as seis capturas contra URL imutável;
4. revisar visualmente o topo de 768px;
5. executar launcher e Projetos com as personas reais quando os secrets estiverem disponíveis;
6. só então avaliar integração pessimista e aprovação modular.
