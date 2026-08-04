# VACINA-020 — Prontidão do PostgreSQL após o bootstrap do contêiner

**Estado:** vigente
**Detectada em:** teste de banco do ciclo de personas, em 28 de julho de 2026

## Qual foi o problema

O runner informou que o PostgreSQL estava pronto e iniciou a primeira fixture,
mas o servidor respondeu que estava desligando.

## Como ocorreu

O entrypoint oficial do PostgreSQL inicia um servidor temporário para criar o
banco e executar a preparação, encerra esse processo e só então inicia o
servidor definitivo. `pg_isready` retornou sucesso durante a janela temporária.

## Por que aconteceu

O teste tratava disponibilidade momentânea da porta como conclusão do ciclo de
inicialização. O contrato necessário era mais forte: bootstrap concluído **e**
servidor definitivo aceitando conexão.

## Como foi detectado

`pnpm test:db:operations` falhou antes da fixture com `the database system is
shutting down`. Os logs do contêiner provaram a sequência: “ready to accept
connections”, shutdown de bootstrap, marcador “init process complete” e novo
start.

Não foi detectado antes porque os runners antigos usam um PostgreSQL externo e
não controlam o ciclo do entrypoint.

## Qual foi a solução

O runner só aceita `pg_isready` depois que os logs contêm
`PostgreSQL init process complete; ready for start up.`. A sondagem continua até
o servidor definitivo responder.

## Varredura e ocorrências equivalentes

O problema foi localizado no novo runner
`scripts/run-operational-notifications-db-tests.mjs`. Os runners que conectam a
um serviço PostgreSQL já iniciado não atravessam este bootstrap.

## Prevenção automática

O próprio `pnpm test:db:operations` cria o contêiner desde zero, aplica fixture,
migration e oito testes SQL. A primeira consulta é a prova de que não entrou na
janela temporária.

## Limitações da prevenção

O marcador pertence à imagem oficial `postgres:16-alpine`. Uma troca de imagem
ou entrypoint exige rever o contrato de prontidão. Falha do daemon Docker
continua sendo pré-requisito explícito e reprova o teste.
