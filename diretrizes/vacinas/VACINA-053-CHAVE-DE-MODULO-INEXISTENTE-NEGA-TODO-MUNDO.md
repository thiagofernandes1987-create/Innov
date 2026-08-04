# VACINA-053 — Chave de módulo que não existe em `app_modules` nega todo mundo, e nega calada

## Qual foi o problema

O campo com sugestão da EAP gravava a etapa e **não gravava o vocabulário**. Ao
lado um do outro, no mesmo instante:

```
work_breakdown_items : etapa criada
value_catalog        : 0 linhas
```

Nenhum erro na tela, nenhum erro no console do navegador. A etapa aparecia na
lista; a sugestão simplesmente nunca vinha de volta.

Encontrada a causa, o mesmo defeito apareceu num lugar muito pior: o aplicativo
**Modelos e Documentações** tem dez políticas e funções guardadas por
`has_module_permission(org, 'modelos', …)`, e nenhuma migration criava a chave
`modelos` em `app_modules`. No banco de desenvolvimento a linha existia porque
foi inserida à mão durante a construção. Num ambiente novo — nascido só das
migrations — o acervo inteiro subiria negando todo mundo.

## Como ocorreu

```sql
if not public.has_module_permission(p_organization_id, 'dashboard', 'READ', null, null) then
  raise exception 'sem acesso a esta organização';
end if;
```

`'dashboard'` foi escolhido justamente por parecer o módulo universal — "todo
mundo tem Início". Ele existe em `lib/modules/registry.ts`, marcado
`system: true`, e é o primeiro da lista.

Só que módulo de sistema **não é semeado no banco**. A chave nunca esteve em
`public.app_modules`.

## Por que aconteceu

```sql
select coalesce(bool_or(access_level >= p_required_level and …), false)
from public.effective_module_permissions(…)
where module_key = lower(p_module_key);
```

Chave inexistente não devolve uma linha com nível `NONE`. Devolve **zero
linhas** — e `bool_or` sobre zero linhas é `null`, que o `coalesce` transforma
em `false`.

O resultado é o pior possível para quem revisa: a negação é **total e
indistinguível de uma negação legítima**. Nega `SUPER_ADMIN` igual nega
visitante. Não existe combinação de perfil, papel ou override que faça passar,
porque o problema não está na permissão — está no fato de que não há o que
permitir.

E some por completo do radar das ferramentas: a migration aplica sem reclamar
(é uma string), o `typecheck` não vê SQL, o teste unitário não sobe banco, e a
tela não quebra — ela só nunca preenche.

Duas confusões se somam aqui, e vale separá-las porque a segunda é a cara:

- **registry em TypeScript ≠ `app_modules` no banco.** São dois catálogos, e a
  presença num não implica presença no outro.
- **inserir à mão durante a construção não é semear.** O ambiente onde a
  funcionalidade foi construída passa a ser o único onde ela funciona, e nada
  registra essa dependência.

## Como foi detectado

Só depois de a falha silenciosa ganhar log. `registrarValorUsado` foi escrita
para falhar em silêncio de propósito — o catálogo é conveniência, e derrubar a
criação de uma etapa porque a sugestão não foi contabilizada seria trocar o
essencial pelo acessório. Mas silêncio sem rastro é outra coisa:

```ts
if (error) console.error(`[sugestoes:${escopo}]`, error.message ?? error);
```

Com uma linha de log, a causa apareceu de primeira:

```
[sugestoes:eap.etapa] sem acesso a esta organização
```

O caso `modelos`, esse, não foi detectado por observação nenhuma — foi o
validador escrito para o caso `dashboard` que o encontrou, na primeira execução.

## Qual foi a solução

Para o catálogo, `is_org_member(organization_id)`. É o predicado que a intenção
sempre pediu: o vocabulário é da organização, e quem participa dela lê e
alimenta. Não depende de módulo instalado — e não deve mesmo, já que o mesmo
catálogo serve EAP, funil, marcador, disciplina e unidade.

Para `modelos`, a migration de semeadura que faltava, idempotente e igual à
linha que já roda em produção.

## Regra

- **Guarda de permissão cita chave que existe em `app_modules`.** Se a
  intenção é "qualquer pessoa da organização", o predicado é `is_org_member`,
  não um módulo escolhido por parecer universal.
- **Funcionalidade que depende de linha em tabela de catálogo traz a migration
  que a cria.** Inserir à mão para destravar a construção é legítimo; terminar
  sem a migration é deixar a funcionalidade presa a um único banco.
- **Falha em silêncio ainda deixa rastro.** Silêncio é para quem está usando a
  tela; para quem mantém, `console.error`. Sem isso, o custo de diagnóstico é
  desproporcional ao tamanho do defeito.

## Prevenção automática

`pnpm validate:module-keys` coleta toda chave citada em
`has_module_permission` nas migrations e exige que ela apareça em algum
`insert into public.app_modules`. Roda no CI. Achou os dois casos —
`dashboard` e `modelos` — na primeira execução.

O validador varre a lista de `values` com controle de profundidade de
parênteses, e não por regex simples: `('literal',` também casa dentro de
`jsonb_build_object(...)`, e a primeira versão aceitava `navigationLabel` e
`dependencies` como se fossem módulos. Validador que alarga em silêncio o que
aceita é pior que validador nenhum, porque passa a atestar o que não verificou.
