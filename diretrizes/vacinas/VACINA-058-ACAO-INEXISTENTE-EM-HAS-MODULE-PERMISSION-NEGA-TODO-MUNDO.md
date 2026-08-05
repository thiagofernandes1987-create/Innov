# VACINA-058 — Ação inexistente em `has_module_permission` nega todo mundo

## Qual foi o problema

As três RPCs do estúdio de objetos pediam autorização assim:

```sql
has_module_permission(org, 'administracao', 'EDIT', null, 'configure')
```

`'configure'` **não existe** como ação. A função resolve a ação num `case`
fechado com `else false`:

```sql
case lower(coalesce(p_action,''))
  when '' then true
  when 'approve' then can_approve
  when 'release' then can_release
  when 'sign' then can_sign
  when 'export' then can_export
  when 'administer' then can_administer
  when 'sensitive' then can_view_sensitive
  else false
end
```

Resultado: a guarda negava **todo mundo**, inclusive `SUPER_ADMIN`. Medido no
navegador, com sessão real de administrador: criar objeto respondia
*"Permissão insuficiente para criar definição de objeto"*.

`publish_object_definition`, escrita em 26 de julho, **nunca foi executável**.
Não é uma regressão: nasceu assim, e o defeito foi copiado por mim para as duas
RPCs do rascunho, porque copiar a linha de guarda de uma função existente
parecia o caminho mais seguro.

## Como ocorreu

`'configure'` é vocabulário da **camada de aplicação**. `lib/authorization.ts`
tem:

```ts
if (capability === "manage" || capability === "assign_users" || capability === "configure")
  return { level: "READ", action: "administer" };
```

Ou seja: a capacidade se chama `configure` e a ação correspondente se chama
`administer`. Quem escreveu o SQL usou o nome da capacidade onde vai o nome da
ação. Os dois nomes descrevem a mesma intenção, em duas linguagens diferentes,
e só uma das duas é aceita ali.

## Por que aconteceu

Três coisas, e a terceira é a que mais importa:

1. **O conjunto de ações é fechado com `else false`, não com erro.** Ação
   desconhecida devolve "não autorizado", que é indistinguível de "autorizado a
   nada". Falhar fechado está certo; falhar **mudo** é o problema.
2. **A definição de `has_module_permission` não tem arquivo no repositório.** É
   uma das 55 aplicações sem arquivo da dívida da S-22. Quem escreve uma
   chamada não tem onde ler o vocabulário aceito sem consultar o banco.
3. **A fixture de teste era mais permissiva que a realidade.** Em
   `supabase/tests/object-runtime/fixture.sql`, o substituto de
   `has_module_permission` devolvia o booleano do teste para *qualquer* ação:

   ```sql
   as $$ select coalesce(nullif(current_setting('test.permission_granted', true), '')::boolean, true); $$;
   ```

   Foi por isso que catorze testes de banco passaram por quarenta dias sobre uma
   função impossível de executar. Fixture mais frouxa que a função real não é
   substituto de fronteira: é uma segunda implementação que aprova o que a
   original recusa.

Parentesco com a **VACINA-053**: lá, chave de módulo inexistente devolvia zero
linhas e `bool_or` sobre zero linhas era `false`. Aqui, ação inexistente
devolve `false` literal. Mesmo argumento, outro argumento da mesma função — e a
mesma consequência: negação silenciosa e universal.

## Como foi detectado

Rodando a tela no navegador com sessão de administrador de verdade, na primeira
tentativa de criar um objeto. Nenhum validador, nenhum teste e nenhuma revisão
de código tinha condições de pegar: o SQL está sintaticamente correto, a função
existe, o argumento é do tipo certo.

## Qual foi a solução

1. **As três RPCs passaram a pedir `'administer'`**, em
   `20260804001000_object_runtime_acao_de_permissao_valida.sql`. A migration
   confere, **antes** de corrigir, que `has_module_permission` reconhece
   `administer` — corrigir para outro nome inventado repetiria o defeito — e
   confere depois que nenhuma das três ainda cita `configure`.
2. **A fixture passou a honrar o vocabulário fechado.** Com ela corrigida e a
   correção removida, os catorze testes do catálogo **falham**. Antes,
   passavam. É a prova de que o ponto cego era a fixture.
3. **`pnpm validate:module-keys` passou a conferir o quinto argumento** contra
   o vocabulário das seis ações, além da chave de módulo que já conferia.

Um detalhe do validador merece registro: ele confere o **estado final**, não o
histórico. Chamada dentro de uma função redefinida por `create or replace` numa
migration posterior não vale mais — a versão antiga não existe em banco nenhum.
Sem isso, o único jeito de deixar o validador verde seria reescrever migrations
já aplicadas, que é exatamente o que a VACINA-057 mostra que quebra a
reconstrução do banco.

## Regra

- **Ação e capacidade têm nomes diferentes.** No banco: `approve`, `release`,
  `sign`, `export`, `administer`, `sensitive`. `configure`, `manage` e
  `assign_users` são nomes de capacidade da aplicação e todos traduzem para
  `administer`.
- **Substituto de fronteira reproduz a fronteira, inclusive o que ela recusa.**
  Fixture que aceita mais que o original transforma o teste em carimbo.
- **Guarda que nunca autorizou ninguém é indistinguível de guarda que funciona**
  até alguém tentar usar. Funcionalidade nova de escrita só é dada por pronta
  depois de executada com sessão real.

## Prevenção automática

`pnpm validate:module-keys`, no CI, agora reprova ação fora do vocabulário —
exercitado com teste negativo (`'inventada'` numa função nova → saída 1). A
fixture corrigida faz os testes de banco reprovarem a mesma classe de erro
dentro do Object Runtime, também exercitado.

A lista de seis ações está escrita no validador porque a definição de
`has_module_permission` não tem arquivo no repositório. Quando a S-22 devolver
a definição, a lista passa a ser derivada dela — e essa dependência está
anotada no próprio validador.
