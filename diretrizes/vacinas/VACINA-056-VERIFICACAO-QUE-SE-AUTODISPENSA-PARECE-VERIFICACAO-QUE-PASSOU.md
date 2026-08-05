# VACINA-056 — Verificação que se autodispensa é indistinguível de verificação que passou

## Qual foi o problema

`diretrizes/RECUPERACAO.md` promete que a plataforma pode ser recuperada a
partir do GitHub, sem depender de conversa, contêiner ou máquina local.
`pnpm test:db:replay` existe desde 25 de julho justamente para verificar essa
promessa executando-a.

Executado hoje, com um PostgreSQL 16 subido no contêiner para isso:

```
Migrations aplicadas em base limpa: 0 de 150.
Parou em: 20260719214500_stage10_homologation_hardening.sql
ERROR:  function public.touch_updated_at() does not exist
```

**Zero de cento e cinquenta.** Falha na primeira. A promessa não se cumpre — e
esse já era o achado da S-22, medido então em 0 de 111. O que mudou em quarenta
dias foi o denominador.

## Como ocorreu

O script foi escrito com uma gentileza razoável:

```js
} catch (error) {
  console.log("PostgreSQL indisponível: replay das migrations NÃO foi executado.");
  process.exit(0);
}
```

Sem banco, avisa e sai **zero**. A mensagem é honesta; o código de saída não.
Para qualquer automação — e para qualquer pessoa que rode um `&&` — "não
rodou" e "passou" são a mesma coisa.

E não havia automação: `test:db:replay` **não está em nenhum workflow**. A
única verificação da promessa de recuperação dependia de alguém lembrar de
rodá-la à mão, num ambiente que tivesse PostgreSQL de pé.

## Por que aconteceu

Porque as duas decisões são individualmente defensáveis e juntas anulam a
verificação:

1. **Sair 0 quando a dependência falta** evita transformar em erro o caso de
   quem está trabalhando noutra coisa, sem banco na máquina. Razoável isolado.
2. **Não ligar ao CI** era consequência do primeiro: ligar não adiantaria,
   porque o runner não tem PostgreSQL e o passo passaria verde sem verificar
   nada. Também razoável isolado.

O resultado é um verificador que **nunca reprovou e nunca poderia reprovar**.
Ele não estava quebrado: estava desligado, com aparência de ligado. Quem
olhasse a lista de scripts veria `test:db:replay` e concluiria que a promessa
de recuperação é verificada.

Vale separar de um caso vizinho que está **certo**: os cinco testes de banco
que rodam no CI usam `scripts/lib/postgres-test-container.mjs`, que **lança
exceção** quando o Docker não está disponível. Ali, faltar a dependência
reprova — e é por isso que aqueles cinco realmente verificam alguma coisa.

## Como foi detectado

Ao mapear o código para documentá-lo, o gerador confrontou as RPCs chamadas com
as declaradas em migration e apontou três sem declaração — entre elas
`has_module_permission`, chamada por 346 trechos de migration e criada por
nenhum. A única definição no repositório é um dublê em
`supabase/tests/*/fixture.sql` que **sempre concede permissão**.

Isso levou ao replay. Como o contêiner não tinha servidor, o script saía 0 e
dizia que não rodou; subir um PostgreSQL 16 local e rodar de novo produziu o
número acima.

Ou seja: o achado não veio da ferramenta que existia para achá-lo. Veio de
outra, por consequência.

## Qual foi a solução

**Nesta vacina, só o que impede a repetição** — reconstruir as migrations é a
S-22 inteira e não cabe aqui.

`--exigir` nos dois scripts que se autodispensavam. Com a bandeira, faltar a
dependência reprova:

```
com banco, --exigir     → saída 1, com o número real (0 de 150)
sem banco, --exigir     → saída 1, "sem banco não há verificação"
sem banco, sem bandeira → saída 0, como antes, para quem roda na mão
```

Quem depende do resultado passa a poder exigi-lo. Quem está trabalhando noutra
coisa continua não sendo atrapalhado.

## Regra

- **Faltar a dependência de uma verificação não pode sair com o mesmo código de
  quem passou.** Ou reprova, ou o chamador tem como exigir que reprove.
- **Verificação que não está em nenhum workflow não é verificação, é intenção.**
  Se não pode entrar no CI ainda, isso é dívida com nome e responsável, não uma
  linha no `package.json` que dá impressão de cobertura.
- **Quando a proteção só pode ser executada num ambiente que não existe no CI,
  o problema é o ambiente** — e resolvê-lo é parte de escrever a proteção, não
  um "depois".
- Ao mapear ou documentar estrutura, **confronte em vez de listar**. A lista de
  RPCs não valeria nada; o confronto entre chamadas e declarações encontrou em
  um comando o que a ferramenta dedicada não encontrou em quarenta dias.

## Prevenção automática

- `--exigir` em `run-migration-replay.mjs` e `run-object-runtime-db-tests.mjs`,
  com os três caminhos executados e conferidos.
- `pnpm validate:code-map` confronta, a cada CI, as RPCs chamadas contra as
  declaradas em migration. O débito conhecido está congelado em
  `diretrizes/mapa-do-codigo.debito.json`, com a S-22 nomeada como responsável;
  **qualquer RPC nova sem migration reprova**, e item que deixe de ser problema
  também reprova enquanto continuar na lista.
- Ligar o replay ao CI continua sendo a T-22.6, com o número de hoje registrado
  no inventário para que o progresso seja medido contra ele.
