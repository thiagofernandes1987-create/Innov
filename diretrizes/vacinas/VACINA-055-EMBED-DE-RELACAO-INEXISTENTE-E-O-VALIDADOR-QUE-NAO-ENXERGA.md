# VACINA-055 — Embed de relação inexistente devolve PGRST200, e um validador só vale pelo que consegue enxergar

## Qual foi o problema

Na tela de tarefas da obra, o seletor de responsável oferecia isto:

```
a3f4b21c · SUPER_ADMIN
```

Um pedaço de UUID no lugar do nome da pessoa. O mesmo na tela de equipes, no
campo de líder. E no console do servidor, nas seis combinações de largura e
tema:

```
[data-access:project-tasks.memberships] { code: PGRST200 }
```

## Como ocorreu

```ts
supabase.from("project_memberships").select("user_id,role,profiles(full_name)")
```

`project_memberships.user_id` referencia **`auth.users`**, não
`public.profiles`. Não existe chave estrangeira entre as duas tabelas, o
PostgREST não consegue montar a junção e devolve `PGRST200`.

Como no caso ambíguo da VACINA-052, **não é o embed que vem vazio: é a consulta
inteira que falha**. A lista de membros voltava nula, e o consumidor caía no
`|| membership.user_id.slice(0, 8)` — o fallback que transformou uma falha de
consulta em "meia interface funcionando".

O restante do repositório já resolvia pessoa do jeito certo, em cinco telas:
buscar `profiles` por `in("id", ids)` e casar em memória. As duas telas com
embed eram as exceções, e as duas estavam quebradas.

## Por que aconteceu

Porque `profiles` **parece** ligada a tudo. É a tabela de pessoas; quase toda
tela mostra nome de gente. O que não é evidente ao escrever o `select` é que a
ligação existe por `auth.users`, um esquema que não está exposto ao PostgREST —
e a ausência de chave estrangeira não produz nenhum aviso em lugar nenhum.

O fallback piorou. `nome || id.slice(0,8)` é defensivo e razoável isolado; junto
com a falha silenciosa, ele garante que a tela **nunca** pareça quebrada. Um
UUID abreviado ao lado do papel passa por identificador técnico, não por
defeito.

## Como foi detectado

Pelo arnês de QA, que conta erros de console e reprova quando há algum. O
`PGRST200` estava lá o tempo todo; o que faltava era alguém tratar `console=1`
como reprovação em vez de ruído.

## Qual foi a solução

Segunda leitura, como nas outras cinco telas, agora com nome próprio em
`lib/pessoas/nomes.ts` para que a próxima tela não volte a tentar o embed.
Depois: `Administrador de Teste · SUPER_ADMIN`.

## O que este caso ensinou sobre o validador — e é a parte que importa

`validate:postgrest-embeds` foi estendido para reprovar também o embed sem
caminho nenhum. A extensão passou por **três estados errados antes de servir**,
e cada um errou de um jeito diferente:

**1. Achatamento da árvore — 22 acusações falsas.** O `select` do PostgREST é
uma árvore: em `from("a").select("b(c(d))")`, `c` é embed de `b`, não de `a`. O
leitor atribuía tudo à tabela do `from` e acusou 22 embeds perfeitamente
válidos em oito módulos. Se eu tivesse confiado na saída, teria "corrigido" 22
consultas que funcionavam.

**2. Universo de tabelas tirado das arestas — aprovação por cegueira.** O filtro
de "nome conhecido" vinha das chaves estrangeiras, e `public.profiles` não é
destino de nenhuma. O embed que motivou a extensão **era descartado antes de
ser avaliado**: o validador rodava verde sobre ele. O universo passou a vir dos
`create table`.

**3. `!inner` lido como nome de constraint.** `budgets!inner(...)` é dica de
junção, não desambiguação. Tratá-lo como chave nomeada fazia o validador
aprovar embed ambíguo escrito com `!inner`.

Corrigidos os três, o validador encontrou **cinco embeds ambíguos que a versão
achatada não via** — em contratos, propostas, orçamentos, qualidade e
assinaturas, todos no padrão "versão atual" que aponta de volta.

## Regra

- **Antes de embutir, confirme que a chave estrangeira existe** — e existe
  entre as tabelas do esquema exposto, não via `auth`.
- **Fallback de exibição não substitui tratamento de erro.** `nome || id` é
  correto para dado ausente; para consulta falha, esconde o defeito. Onde há
  fallback, o erro precisa ser reportado à parte.
- **Validador aprova por três motivos, e só um é bom:** porque está tudo certo,
  porque não enxergou, ou porque leu errado. Antes de confiar num verde,
  **reintroduza o defeito e exija o vermelho** — foi o que expôs os estados 1 e
  2 aqui, e o ponto cego do `alter table` na VACINA-052.
- **Saída longa de validador novo é suspeita antes de ser trabalho.** Vinte e
  duas acusações em oito módulos que nunca deram sinal de defeito são, quase
  sempre, um erro de leitura — verifique uma antes de corrigir todas.

## Prevenção automática

`pnpm validate:postgrest-embeds`, no CI, reprova as duas metades: embed sem
caminho (PGRST200) e embed ambíguo sem chave nomeada (PGRST201). Os dois ramos
têm teste negativo executado — reintroduzir o defeito, exigir reprovação,
restaurar, exigir aprovação.
