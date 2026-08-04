# VACINA-014 — Runner de teste de banco descobre migrations, não as lista

## Sintoma

`scripts/run-pipeline-db-tests.mjs` reportava "Pipeline — 21 testes de comportamento aprovados" com o encadeamento verde, enquanto o banco de produção já tinha duas migrations a mais que o runner nunca aplicava. Um teste novo, escrito contra uma tabela criada na migration mais recente, falhava com `relation "public.pipeline_card_activities" does not exist` — e a mensagem apontava para o teste, não para o runner.

```js
// O que existia:
const files = [
  "supabase/tests/pipeline/fixture.sql",
  "supabase/migrations/20260726120000_pipeline_trilhas.sql",
  "supabase/migrations/20260726123000_pipeline_presets.sql",
  "supabase/migrations/20260726190000_pipeline_endurecimento.sql",
  "supabase/tests/pipeline/pipeline.test.sql"
];
```

Duas migrations posteriores — `..._pipeline_seguidores.sql` e `..._pipeline_conversa_e_etapas.sql` — foram criadas, aplicadas ao Supabase e nunca entraram nessa lista.

## Causa raiz

- lista de arquivos escrita à mão, que só envelhece: quem cria a migration seguinte não tem motivo para abrir o runner;
- nada no CI relaciona o conteúdo de `supabase/migrations/` com o que o runner encadeia;
- o teste continuou passando, o que é a pior forma de falha: um esquema mais antigo que o de produção sendo exercitado como se fosse o atual;
- a suíte dava confiança sobre invariantes (RLS, CHECK, chave composta) que não existiam no banco em que ela rodava.

## Vacina

- runner de teste de banco **descobre** as migrations do seu domínio por padrão de nome e as ordena por nome, que é a ordem cronológica que o Supabase aplica;
- o runner imprime quantas migrations encadeou, para que "5" virando "4" seja visível na saída;
- lista vazia é erro, não silêncio;
- toda migration nova do domínio entra no encadeamento sem nenhuma edição de script.

```js
const migracoes = fs
  .readdirSync("supabase/migrations")
  .filter(nome => /_pipeline_.*\.sql$/.test(nome))
  .sort()
  .map(nome => `supabase/migrations/${nome}`);

if (migracoes.length === 0) {
  console.error("Nenhuma migration de pipeline encontrada em supabase/migrations.");
  process.exit(1);
}
console.log(`Migrations de pipeline no encadeamento: ${migracoes.length}`);
```

## Aplicação transversal

Aplicada em `scripts/run-pipeline-db-tests.mjs`. Vale para todo runner que aplique um subconjunto de migrations antes de um arquivo de teste:

- `scripts/run-object-runtime-db-tests.mjs`;
- `scripts/run-migration-replay.mjs`;
- qualquer runner futuro que encadeie migrations por domínio.

O critério de nomenclatura é o contrato: migration de um domínio carrega o nome do domínio no arquivo (`_pipeline_`, `_object_runtime_`). Migration que foge do padrão fica fora do encadeamento e precisa ser renomeada, não adicionada à mão.

## Padrão proibido

```js
const files = ["supabase/migrations/20260101000000_qualquer_coisa.sql", /* ... */];
```

Enumerar migrations por caminho literal em runner de teste.

## Teste negativo

O próprio `console.log` do encadeamento é a evidência: a saída passou de silêncio para `Migrations de pipeline no encadeamento: 5`. Um teste que dependa de uma migration nova falha imediatamente quando o encadeamento regride, em vez de passar sobre um esquema antigo.

## Limitação registrada

A descoberta por nome não valida a **ordem semântica** — só a lexicográfica. Ela coincide com a cronológica enquanto o prefixo de data for mantido, que é a convenção do Supabase e do repositório. Migration com prefixo fora do padrão de data quebraria a ordem sem quebrar o teste.
