# VACINA-064 — Aplicativo declarado no código e ausente do catálogo não existe para ninguém

## Qual foi o problema

O relato veio de quem usa: *"o módulo de RH está sem chamada ativa"*.

O código do RH está inteiro. `lib/modules/registry.ts` declara a chave `rh`,
com rota `/app/rh`, categoria, dependências e ordem. `lib/casca/menus.ts`
declara os cinco menus do aplicativo. O roteador tem as páginas. As server
actions existem e são alcançáveis. Nenhuma ferramenta do repositório reclamava
de nada — `tsc` verde, `pnpm audit:reachability` com zero ilhas, `pnpm
validate:menus` com os 112 destinos conferidos.

E o aplicativo não aparecia para usuário nenhum.

Medido no projeto remoto no dia da auditoria:

```
lib/modules/registry.ts   : 25 módulos
public.app_modules        : 23 linhas   (sem 'rh', sem 'dashboard')
```

## Como ocorreu

A central de aplicativos não lê o registry. Ela lê o banco:

```ts
// lib/authorization.ts:40
const { data, error } = await context.supabase
  .rpc("list_my_modules", { p_organization_id: context.organizationId });
```

`list_my_modules` resolve contra `public.app_modules`. Chave que não está lá não
volta como aplicativo de nível `NONE` — não volta linha nenhuma. O `filter` da
página descarta o que não veio, e o resultado é indistinguível de "este usuário
não tem permissão": a central monta normalmente, com os outros 23 aplicativos,
e o RH simplesmente não está na lista.

É a mesma mecânica da VACINA-053 vista pelo outro lado. Lá, a chave inexistente
fazia `has_module_permission` negar todo mundo dentro de uma policy. Aqui ela
faz o aplicativo inteiro desaparecer da porta de entrada.

## Por que aconteceu

Porque **as duas fontes são arquivos diferentes, cada um coerente consigo
mesmo**, e nenhum portão as cruzava.

`validate:module-keys` já existia e cobre uma direção só: *chave usada em SQL
precisa estar semeada em `app_modules`*. Ele parte do SQL. Módulo declarado no
registry que ainda não é citado por nenhuma policy passa por ele sem uma linha
de reclamação.

Foi por aí que o RH entrou. A declaração no registry é de 07/08/2026, junto com
rota, menu e páginas. A semeadura em `app_modules` só chegou em
`20260809141000_rh_module_catalog_seed.sql`, **dois dias depois** — e o
comentário no topo daquela migration descreve o defeito com todas as letras,
o que confirma que a lacuna foi percebida por observação humana e não por
portão. No intervalo, num ambiente nascido apenas das migrations, o aplicativo
existia inteiro no código e não existia para nenhum usuário.

Um segundo caso da mesma família estava vivo no repositório no dia da
auditoria, e esse ninguém tinha percebido: `lib/casca/menus.ts` declarava um
bloco `ocorrencias` com dois destinos. A chave do aplicativo de pós-venda no
registry é `sac` — a rota é que é `/app/ocorrencias`. Como
`navegacao-do-modulo.tsx` pede o menu por `menusDe(modulo.chave)` e
`moduleForPath()` devolve a chave do registry, aquele bloco **nunca foi
renderizado uma vez sequer**. Os dois destinos já existiam dentro de `sac`, o
que explica por que nada parecia faltar na tela.

## Como foi detectado

Por cruzamento executado das três fontes, depois do relato. O que cada
ferramenta existente respondia antes:

| Ferramenta | Resposta sobre o RH | Por quê |
| --- | --- | --- |
| `tsc` | verde | não lê SQL |
| `pnpm audit:reachability` | 0 ilhas | o grafo de imports está íntegro |
| `pnpm validate:menus` | 112 destinos, todos com página | o menu existe e a página existe |
| `pnpm validate:module-keys` | 0 divergências | nenhuma policy citava `'rh'` ainda |
| `pnpm validate:exports-mortos` | 0 exports sem importador | as actions têm importador |

Cinco portões verdes sobre um aplicativo que nenhum usuário alcançava.

## Qual foi a solução

`scripts/validate-modulos-semeados.mjs` (`pnpm validate:modulos-semeados`),
no CI logo depois do `validate:module-keys`. Ele cruza registry × `app_modules`
× menus × roteador nas cinco direções, e cada uma tem significado próprio:

- **[A]** registry → `app_modules`: aplicativo que nenhum usuário alcança;
- **[B]** `app_modules` → registry: linha de catálogo sem rota para onde levar;
- **[C]** menus → registry: menu que nunca é renderizado — o caso `ocorrencias`;
- **[D]** registry → menus: aplicativo sem navegação interna (VACINA-028);
- **[E]** registry → roteador: rota declarada sem pasta correspondente.

`dashboard` é a única exceção, declarada no próprio validador com o motivo: não
é aplicativo instalável, é a própria central, e semear criaria um item que se
lista dentro de si mesmo. A exceção não afrouxa a VACINA-053 — usar essa chave
como argumento de permissão continua reprovando no `validate:module-keys`.

O bloco morto `ocorrencias` foi removido de `lib/casca/menus.ts`. Os destinos
distintos continuam 74; o total caiu de 112 para 110, que são exatamente as
duas linhas duplicadas que nunca foram exibidas.

## Prova por sabotagem

Cada direção foi quebrada de propósito, uma por vez, com restauração conferida:

| Sabotagem | Saída |
| --- | --- |
| base, sem sabotagem | `exit=0` |
| [A] módulo `frota` no registry, sem semeadura | `exit=1` — acusa [A] e [D] |
| [B] registry renomeia `estoque` para `estoque_x` | `exit=1` — acusa [A] e [B] |
| [C] rechave `ocorrencias` no menus | `exit=1` — acusa [C] |
| [D] menu de `estoque` renomeado | `exit=1` — acusa [C] e [D] |
| [E] `routePrefix` de `estoque` para `/app/almoxarifado` | `exit=1` — acusa [E] |
| restaurado | `exit=0` |

## Varredura e ocorrências equivalentes

A varredura do dia encontrou dois casos desta família e nenhum terceiro:
`rh` (semeadura já existente na migration de 09/08, pendente de aplicação) e
`ocorrencias` (corrigido aqui). Nas outras direções: 0 chaves semeadas sem
registry, 0 módulos sem rota.

## Limitações da prevenção

O portão é estático: confere que a **migration existe**, não que ela **foi
aplicada**. No dia desta vacina o `rh` passa no validador e continua ausente do
projeto remoto, porque as 68 migrations `rh_*` não estão aplicadas — débito
registrado em `diretrizes/migrations-aplicadas.json` e conferido por
`pnpm validate:migrations-applied`, que é o portão daquele outro lado.

São dois defeitos diferentes com o mesmo sintoma, e por isso dois portões: um
impede que o repositório declare um aplicativo sem catálogo; o outro mede a
distância entre o repositório e o banco. Aplicativo só aparece quando os dois
estão satisfeitos.
