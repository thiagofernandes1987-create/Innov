# Auditoria de superfícies esquecidas — 10/08/2026

**Documento canônico:** não. É o registro datado de uma varredura, com os
números que ela mediu e o que ficou pendente.

**Origem.** Relato de uso: *"o módulo de RH está sem chamada ativa"*, seguido do
pedido de conferir se existiam mais funções, módulos, tabelas e variáveis
esquecidas. As quatro perguntas foram tratadas como quatro micro-problemas
independentes, cada um com medição executada.

## 1. O relato: por que o RH não aparecia

O código do RH está completo e coerente. O que falta é a **linha no catálogo**.

```
lib/modules/registry.ts   : 25 módulos
public.app_modules        : 23 linhas   (sem 'rh', sem 'dashboard')
```

A central de aplicativos não lê o registry — lê `list_my_modules`
(`lib/authorization.ts:40`), que resolve contra `public.app_modules`. Chave
ausente não volta como aplicativo de nível `NONE`; não volta linha nenhuma. O
RH some da lista sem erro, sem log e sem teste vermelho.

A causa é de **aplicação, não de código**: a semeadura existe em
`supabase/migrations/20260809141000_rh_module_catalog_seed.sql`, e as 68
migrations `rh_*` do ramo **não estão aplicadas** no projeto remoto — débito já
declarado em `diretrizes/migrations-aplicadas.json` e conferido por
`pnpm validate:migrations-applied` (268 arquivos, 208 aplicadas). Num ambiente
nascido só das migrations, o RH aparece.

Aplicar as 68 migrations em banco real é ação externa e irreversível, com
homologação isolada exigida pelo próprio ledger. **Não foi feita nesta
auditoria** e depende de decisão explícita.

O que foi feito: fechar o buraco de processo que deixou o aplicativo existir por
dois dias sem catálogo — ver §2.

## 2. Módulos — 1 defeito vivo, corrigido

Cruzamento das três fontes (registry × `app_modules` × menus × roteador):

| Direção | Achados |
| --- | --- |
| registry → `app_modules` | 1 — `dashboard`, exceção declarada com motivo |
| `app_modules` → registry | 0 |
| menus → registry | **1 — `ocorrencias`, chave morta** |
| registry → menus | 0 |
| registry → roteador | 0 |

`lib/casca/menus.ts` declarava um bloco `ocorrencias` com dois destinos. A
chave do aplicativo de pós-venda no registry é `sac` — `ocorrencias` é a rota.
Como `navegacao-do-modulo.tsx` resolve o menu por `moduleForPath()`, que
devolve a chave do registry, **aquele bloco nunca foi renderizado**. Os dois
destinos já existiam dentro de `sac`, o que explica por que nada parecia
faltar. Removido: os destinos distintos continuam 74, o total caiu de 112 para
110.

Prevenção: `pnpm validate:modulos-semeados`, no CI, provado por sabotagem nas
cinco direções. Causa raiz em `VACINA-064`.

## 3. Funções — 10 RPCs sem chamador

De 404 funções vivas nas migrations, 10 não têm chamador em código de aplicação
nem em SQL:

| Função | Tem teste DB | Situação |
| --- | --- | --- |
| `create_channel_pilot_plan` | sim | superfície do piloto de mensageria, sem tela |
| `record_channel_pilot_assessment` | sim | idem |
| `record_channel_pilot_daily_review` | sim | idem |
| `record_channel_verification_run` | sim | idem |
| `create_proposal_from_budget_version` | sim | caminho comercial alternativo, sem tela |
| `approve_rh_payroll_accounting_batch` | **não** | RH — contabilização de folha |
| `generate_rh_payroll_accounting_batch` | **não** | RH — idem |
| `generate_rh_payroll_provisions` | **não** | RH — provisões |
| `create_rh_payroll_parameter` | **não** | RH — o código chama a variante `_from_template` |
| `create_rh_employment_esocial_contract_profile_version` | **não** | RH — versionamento de perfil |

As cinco primeiras são superfície construída e testada à espera de interface. As
cinco de RH são as que merecem revisão no piloto do módulo: quatro sem chamador
e sem teste, e `create_rh_payroll_parameter` com o agravante de ter uma irmã de
nome quase igual (`create_rh_payroll_parameter_from_template`) que é a
efetivamente usada por `app/actions/rh-payroll-config.ts:22` — nome parecido é
o que faz uma auditoria por leitura concluir que a função tem chamador.

Remover função de banco é migration destrutiva e não foi feita aqui.

## 4. Tabelas — 1 sem leitura nem escrita

De 331 tabelas vivas, `object_records` é a única sem qualquer leitura ou escrita
fora do próprio DDL. Tem teste DB (`supabase/tests/object-runtime/registros.test.sql`)
e está documentada em `diretrizes/OBJECT-RUNTIME.md`: é o armazém de registros
do Object Runtime, cuja interface ainda não existe. Superfície declarada, não
tabela esquecida — mas fica nomeada aqui para não voltar a ser descoberta.

As outras 19 candidatas da primeira passagem caíram quando a medição passou a
descontar DDL, índice, RLS e `grant`: são escritas por função de banco, não pelo
app. O primeiro número, 20, era artefato do heurístico.

## 5. Variáveis de ambiente — 27 de runtime, corrigidas

De 136 variáveis lidas em código, 85 não tinham menção em `README`,
`.env.example`, `vercel.json`, `deploy/`, `docs/` ou `diretrizes/`. Separadas
por quem as lê:

| Grupo | Antes | Depois |
| --- | --- | --- |
| lidas por código de runtime (`app`, `lib`, `components`, `services`, `apps`) | 27 | **0** |
| lidas só por script, teste ou CI | 58 | 58 |

As 27 de runtime estavam concentradas no mesmo lugar do relato: 23 são do RH
(eSocial e Integra Contador), 4 do laboratório Baileys, 1 do SINAPI. Entre elas,
três com consequência silenciosa se ficarem em branco:

- `ESOCIAL_ENABLE_PRODUCTION` — só o literal `"true"` libera produção;
- `SINAPI_PROBE_TOKEN` — com menos de 32 caracteres a rota interna fica fechada;
- `BAILEYS_LAB_CONFIRM` — sem a confirmação literal, o laboratório não sobe.

Todas as 27 foram declaradas em `.env.example`, com o default real lido do
código e o comportamento de borda escrito ao lado. As 58 restantes são botões de
bancada de teste e ficam registradas aqui como dívida de menor severidade.

## 6. O que fica pendente

| Pendência | Por quê |
| --- | --- |
| Aplicar as 68 migrations `rh_*` | ação externa e irreversível; exige homologação isolada com evidência real |
| 5 RPCs de RH sem chamador e sem teste | remoção é migration destrutiva; decisão do piloto do módulo |
| 5 RPCs de piloto/comercial sem tela | superfície testada à espera de interface |
| `object_records` sem interface | Object Runtime ainda sem tela |
| 58 variáveis de script/teste sem declaração | severidade menor; não afetam runtime |

## 7. Como reproduzir os números

```
pnpm validate:modulos-semeados     # 25 registry / 24 semeados / 24 menus / 25 rotas
pnpm validate:menus                # 110 destinos, 74 distintos
pnpm validate:migrations-applied   # 268 arquivos, 208 aplicadas
pnpm audit:reachability            # 517 arquivos, 500 alcançáveis, 11 candidatos
pnpm audit:server-actions          # 323 actions, 0 sem consumidor
pnpm audit:supabase-surface        # superfícies sem consumidor JS/TS
```
