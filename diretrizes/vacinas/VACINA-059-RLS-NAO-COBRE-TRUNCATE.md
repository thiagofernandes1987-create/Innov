# VACINA-059 — RLS não cobre `TRUNCATE`, e 213 tabelas o concediam

## Qual foi o problema

Toda a proteção de dado desta plataforma está em RLS: política por tabela,
`force row level security`, e o privilégio bruto deixado no padrão do
fornecedor — `grant all` para `anon` e `authenticated`, como o Supabase cria.
Para `select`, `insert`, `update` e `delete` isso funciona: a política é
avaliada linha a linha e nega quem não pode.

**`TRUNCATE` não passa por política nenhuma.** É comando de tabela, não de
linha, e o PostgreSQL não aplica row security a ele.

Medido em banco local, com a proteção no máximo:

```sql
create table public.prova_truncate(id int, dono text);
insert into public.prova_truncate values (1,'a'),(2,'b');
alter table public.prova_truncate enable row level security;
alter table public.prova_truncate force row level security;
create policy so_leitura on public.prova_truncate for select to authenticated using (false);
grant select, truncate on public.prova_truncate to authenticated;

set local role authenticated;
truncate public.prova_truncate;
```

```
antes: 2 linhas | erro no truncate: nenhum | depois: 0 linhas
```

RLS habilitada **e forçada**, única política `using (false)` — o truncate
esvaziou a tabela sem erro.

No projeto: **213 tabelas** concediam `TRUNCATE` a `anon` e a `authenticated`,
incluindo `emitted_documents`, `contracts`, `finance_entries`, `projects` e as
64 partições de `object_records`.

## Como ocorreu

Ninguém escreveu esses `grant`. Eles vêm do `alter default privileges` que o
Supabase configura no projeto: tabela nova em `public` nasce com todos os
privilégios para `anon` e `authenticated`, e a RLS é apresentada como a
fronteira. Para o que passa pelo PostgREST, é.

O detalhe que escapa é que a fronteira tem um buraco de tamanho tabela, e o
buraco é invisível na revisão: quem lê a migration vê `enable row level
security`, `force row level security` e as políticas certas. Está tudo lá. O
que não está em lugar nenhum é o privilégio que não foi revogado.

## Por que aconteceu

Porque **"a RLS protege" é verdade suficiente para quase tudo, e falsa em um
caso** — e o caso não aparece em nenhum teste, porque nenhum teste tenta
truncar.

Vale o parentesco com a **VACINA-058**: lá, um `case` fechado com `else false`
negava em silêncio; aqui, um comando fora do alcance da política permite em
silêncio. Nos dois, a leitura do código dá a resposta errada porque a regra que
decide está em outro lugar.

## Como foi detectado

Conferindo uma afirmação do inventário antes de marcá-la concluída. A T-32.2.7
dizia que `emitted_documents` era imutável por ser uma "tabela **sem UPDATE**".
A consulta aos privilégios mostrou `DELETE, INSERT, REFERENCES, SELECT,
TRIGGER, TRUNCATE, UPDATE` para `anon` e `authenticated`.

A imutabilidade era real — mas vinha da **ausência de política** de UPDATE sob
RLS forçada, não da ausência de privilégio. Ao conferir o resto, apareceu o
`TRUNCATE`, que nenhuma política alcança.

## Qual foi a solução

```sql
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
revoke update, delete on public.emitted_documents from anon, authenticated;
```

`TRIGGER` e `REFERENCES` vão junto pelo mesmo motivo: nenhum papel da aplicação
cria trigger ou chave estrangeira em tempo de execução.

A migration confere o efeito na própria aplicação — zero concessões restantes,
`emitted_documents` sem UPDATE/DELETE — e confere também o que **não** pode ter
caído junto: o `SELECT` de `projects` para `authenticated`. Revogação larga que
derruba a leitura da aplicação seria uma troca ruim, e é o erro mais provável
aqui.

Conferido depois: 0 concessões perigosas, 234 tabelas com `SELECT` intactas, e
onze telas do produto abrindo em 200 sem bloqueio.

Um detalhe do caminho: a primeira versão incluía `supabase_admin` na lista de
papéis cujo padrão seria alterado, e o servidor recusou a migration inteira com
`42501`. Papel sem alçada passou a ser anotado e ignorado — derrubar tudo por
causa do padrão de um papel deixaria as 213 tabelas exatamente como estavam.

## Regra

- **RLS não cobre `TRUNCATE`.** Tabela protegida por política continua
  esvaziável por quem tem o privilégio. Se o dado importa, o privilégio precisa
  ser revogado — política não basta.
- **Privilégio herdado do padrão do fornecedor não aparece em revisão de
  código.** Ele não está em migration nenhuma. Conferir exige olhar o banco.
- **Imutabilidade por ausência de política é uma trava só.** Uma política `for
  all` acrescentada depois abre tudo. Onde o dado é registro definitivo —
  documento emitido, evento de auditoria, versão publicada — revogue o
  privilégio também.
- Ao marcar uma tarefa concluída, **confira a afirmação, não a intenção**: era
  "tabela sem UPDATE" no papel e `grant update` no banco.

## Prevenção automática

O instantâneo `diretrizes/migrations-aplicadas.json` passou a carregar
`privilegios.perigosos` — `TRUNCATE`, `TRIGGER` e `REFERENCES` concedidos a
`anon` ou `authenticated` —, preenchido por `pnpm ledger:atualizar` e conferido
por `pnpm validate:migrations-applied` no CI. Lista não vazia reprova.

Exercitado com teste negativo: duas entradas falsas no instantâneo → saída 1,
nomeando as tabelas.
