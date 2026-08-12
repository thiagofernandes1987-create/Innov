# VACINA-068 — Alvo de banco herdado de configuração invisível, em vez de declarado e conferido

## Qual foi o problema

Em 11 e 12/08/2026, **dois dias inteiros de trabalho de banco foram feitos no
projeto Supabase errado**: medição, diagnóstico e duas migrations aplicadas. O
projeto desta plataforma é `jpqojevrmefcvsgoffnp` (`supabase-crimson-bridge`),
informado pelo proprietário em 12/08. Tudo tinha ido para `wyeojufebtwblsubkunr`.

O que deixou de valer no mesmo instante:

```
245 tabelas, 252 funções em public              ARQUITETURA.md §13
77 tabelas sem create table em migration        ARQUITETURA.md §13, S-77
7 colunas no banco e não nas migrations         COLUNAS-SEM-MIGRATION.json
121 migrations pendentes; 210 aplicadas         migrations-aplicadas.json
10 funções chamáveis por anon                   S-76
document_templates PLATAFORMA = 0 linhas        S-78
duas escritas cross-tenant corrigidas no banco  S-69, VACINA-065
```

Nenhuma delas é necessariamente falsa para o projeto certo. **Nenhuma foi
verificada nele** — e a diferença entre estar errado e não ter medido custa o
mesmo trabalho para desfazer.

A primeira medição do banco certo mudou o diagnóstico inteiro: 144 tabelas
contra 245, 196 funções contra 252, `rh_workers` inexistente, 1 organização, 0
obras — e a branch `main` em `MIGRATIONS_FAILED` desde 22/07/2026. As 101
tabelas de diferença não eram atraso: eram uma sequência que tentou e quebrou.

## Como ocorreu

O `project_id` do MCP do Supabase é **parâmetro de chamada de ferramenta**, não
configuração fixada. Eu escolhi um projeto de uma lista devolvida por
`list_projects` e nunca mais confiri. A `SUPABASE_DB_URL` do runner tem o mesmo
formato de problema pelo lado oposto: é segredo opaco, e ninguém imprime um
segredo, então ninguém sabe para onde ele aponta.

Nos dois casos o alvo era **herdado**. Não havia configuração apontando para o
lugar errado — havia ausência de conferência.

## Por que aconteceu

Porque não existia no repositório **nada contra o que conferir**. Não havia
arquivo dizendo *"o banco desta plataforma é este"*. Sem declaração, "conferir o
alvo" não é uma operação possível: é uma intenção.

É a mesma classe que este repositório vinha catalogando na mesma semana —
**medir a coisa parecida em vez da coisa**:

| Vacina / sprint | Mediu | Devia medir |
| --- | --- | --- |
| `validate:prevencao-declarada` | o disco de trabalho | o repositório (`git ls-files`) |
| S-69 | o repositório | o banco |
| **esta** | **um banco** | **o banco** |

Nas duas primeiras o erro custou uma execução de CI. Nesta, custou a confiança
em todo número de banco produzido em dois dias.

### As duas causas mecânicas, medidas em 12/08/2026

*(acrescentado depois de recuperar o acesso ao banco)*

Ficar em "eu escolhi de uma lista e não confiri" era autocrítica, não diagnóstico.
Medido, o mecanismo é pior e mais específico:

```
list_projects        → 1 projeto:      wyeojufebtwblsubkunr
list_organizations   → 1 organização:  wyczhqzyfyaqgdeelbuj
get_project(jpqoje…) → responde:       org vercel_icfg_JXX1qOSYgSSnIvOjuMACVBnV
```

**O projeto certo não aparece na listagem.** Ele pertence a uma organização
gerida pelo Vercel, e nenhuma das duas ferramentas de descoberta a enumera —
mas o acesso direto funciona. Escolher "da lista" **nunca poderia** ter dado o
projeto certo: só o alcança quem já sabe o `ref` e pergunta por ele. Uma lista
que omite o alvo certo e mostra um parecido é pior que uma lista vazia, porque
a vazia obriga a perguntar.

A segunda, que fecha o caminho do diagnóstico por ensaio: **`execute_sql` do MCP
roda em transação somente-leitura** (`25006: cannot execute CREATE TABLE in a
read-only transaction`). Toda medição por ali é inofensiva por construção, e
nenhuma migration pode ser ensaiada e desfeita por ela.

### A variante que este portão não pega: chave e URL discordando

Encontrada em 12/08/2026, auditando as chaves a pedido do proprietário. O
`.env.local` tinha:

```
NEXT_PUBLIC_SUPABASE_URL              → jpqoje…   (certo)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  → wyeoju…   (errado)
```

Ao reapontar o arquivo eu troquei a URL e deixei a chave: a metade visível
corrigida e a invisível intacta, **dentro da correção do erro que é exatamente
isso**.

O que torna a variante silenciosa: a chave publicável nova (`sb_publishable_…`)
**não carrega o `ref`**, ao contrário do JWT anon legado, que o traz na claim
`ref`. Não há como conferir olhando — só comparando com a chave real do projeto.
Portão para isso é a T-79.7, e ele não pode viver no repositório: a chave de
produção está no Vercel, fora do alcance de qualquer validador de CI.

## Como foi detectado

Pelo proprietário, ao ver o `ref` numa mensagem minha e responder
`jpqojevrmefcvsgoffnp é o banco correto`. Não houve sintoma técnico: as consultas
respondiam, as migrations aplicavam, o CI ficava verde. **Um alvo errado que
funciona não emite sinal nenhum** — é por isso que ele precisa de portão e não de
atenção.

## Qual foi a solução

Três peças, e a primeira é a que faltava:

1. **`diretrizes/BANCO-ALVO.json`** — a declaração canônica, em commit: `ref`,
   nome de exibição, host direto, data, quem declarou, por quê, e o histórico do
   projeto que foi usado por engano. É o "contra o que conferir".
2. **`scripts/banco-alvo.mjs`** — a conferência em tempo de execução, com as
   duas perguntas:
   - `anunciarAlvoOuSair(url)` para quem fala com o banco da plataforma: recusa
     antes de abrir conexão se a string não alcança o `ref` declarado;
   - `recusarBancoDaPlataforma(url)` para quem cria banco descartável: recusa se
     a string alcança **qualquer** projeto Supabase, porque ali alvo errado é
     `drop database` no lugar errado.
3. **`pnpm validate:banco-alvo`** — o portão no CI: declaração válida, `.mcp.json`
   apontando para o `ref` declarado, todo script que lê `SUPABASE_DB_URL`
   conferindo, todo workflow que usa o segredo anunciando, e nenhuma citação a
   outro projeto sem data no mesmo bloco.

### O alvo é a primeira linha impressa

O `--conferir` do `aplicar-migrations` imprime o alvo **antes** de contar o lote.
A ordem não é estética: um plano de 119 migrations impresso acima da linha do
alvo é um plano que se lê inteiro antes de descobrir para onde vai. Foi lendo o
conteúdo certo sem olhar o destino que isto aconteceu.

Esse mesmo passo, no workflow, é como se descobre para onde
`secrets.SUPABASE_DB_URL` aponta **sem nunca imprimi-la**: o `project_ref` já é
público — está no `.mcp.json` — e a senha nunca passa por lá.

### Desviar de propósito continua possível

`BANCO_ALVO=<ref>` ou `BANCO_ALVO=local` desvia o alvo numa execução. Não é porta
dos fundos: é a diferença entre desviar por engano e desviar digitando, e fica no
comando e no log. `--com-destrutivas` e a confirmação literal `APLICAR` têm a
mesma forma, pelo mesmo motivo. Quando o alvo não é o canônico, a saída diz isso
em duas linhas em vez de anunciar sucesso.

## Prevenção automática

`pnpm validate:banco-alvo` (`scripts/validate-banco-alvo-declarado.mjs`) roda no
CI e reprova quando: `diretrizes/BANCO-ALVO.json` falta ou está incompleto; o
`project_ref` do `.mcp.json` não é o declarado; um script lê `SUPABASE_DB_URL`
sem chamar `anunciarAlvoOuSair`; um script cria banco descartável a partir de
`DATABASE_URL` sem chamar `recusarBancoDaPlataforma`; um workflow usa
`secrets.SUPABASE_DB_URL` sem o passo de conferência; ou um documento cita outro
projeto sem data no mesmo bloco.

Em tempo de execução, `scripts/banco-alvo.mjs` recusa antes de abrir conexão —
em `scripts/aplicar-migrations-pendentes.mjs`,
`scripts/atualizar-ledger-de-migrations.mjs`,
`scripts/run-stage20-backup-restore-drill.mjs` e nos seis `run-*-db-tests.mjs`.

## Prova por sabotagem

Executada em 12/08/2026. As strings de conexão usadas são falsas — não há
credencial real em nenhuma linha abaixo.

| Sabotagem | Saída |
| --- | --- |
| base, tudo no lugar | `exit=0` — 3 scripts leem `SUPABASE_DB_URL` e conferem, 6 criam banco descartável e recusam Supabase, 2 workflows anunciam, 9 citações a outro projeto todas datadas |
| `SUPABASE_DB_URL` para `wyeoju…`, `aplicar-migrations --conferir` | `exit=2` — recusa **antes de imprimir o plano**, dizendo os dois `ref` |
| `SUPABASE_DB_URL` para `jpqoje…` (direta) | `exit=0` — segue para o plano, 119 no lote |
| `SUPABASE_DB_URL` para `jpqoje…` (pooler) | `exit=0` — reconhece a forma `postgres.<ref>@` |
| `.mcp.json` apontando para `wyeoju…` | `exit=1` — *"o MCP fala com outro banco"* |
| script novo lendo `SUPABASE_DB_URL` sem conferir | `exit=1` — acusa o arquivo novo |
| workflow com o passo de conferência removido | `exit=1` — acusa o workflow |
| documento citando outro projeto sem data | `exit=1` — acusa arquivo e linha |
| `diretrizes/BANCO-ALVO.json` removido | `exit=1` — recusa; ausência não passa por omissão |
| `run-object-runtime-db-tests` apontado para `jpqoje…` | `exit=2` — *"cria e derruba banco descartável e recusa qualquer projeto Supabase"* |
| o mesmo, apontado para Postgres local | segue — o portão não barra o caso legítimo |
| `BANCO_ALVO` declarado, conexão de outro projeto | `exit=2` — *"você declarou e a conexão não bate"* |
| conexão irreconhecível, sem declarar `local` | `exit=2` — não deixa passar por não saber |
| restaurado | `exit=0` |

Duas correções feitas **por causa** da sabotagem, e as duas eram defeito real:

- a primeira versão do portão acusou os seis `run-*-db-tests.mjs` por não
  conferirem o alvo declarado — e o alvo certo deles é justamente outro. Acusação
  errada, da mesma família dos falsos positivos que a S-73 passou o dia
  corrigindo. Virou a guarda inversa;
- a primeira versão da mensagem imprimia `wyeoju… (supabase-crimson-bridge)`:
  batizava o projeto desviado com o nome do certo. Linha que se lê rápido e
  confirma o que não foi conferido.

## Limitações da prevenção

- **O MCP não é alcançável por portão em tempo de execução.** O `project_id`
  continua sendo parâmetro de cada chamada, e nenhum validador roda dentro delas.
  O que o portão faz é conferir o `.mcp.json`, que é o lugar onde o `ref` fica
  fixado — e foi o arquivo que teria dado a resposta no primeiro minuto.
- **A isenção por data é grosseira**, igual à da VACINA-067: uma data no mesmo
  bloco isenta a citação. Erra para o lado de deixar passar, de propósito.
- **Não confere o conteúdo do banco.** Que o `ref` esteja certo não diz que o
  esquema esteja. O `MIGRATIONS_FAILED` de 22/07/2026 continua aberto, e é
  diagnóstico, não portão.
