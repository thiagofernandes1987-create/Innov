# VACINA-018 — Erro de autenticação classificado por código

**Estado:** vigente
**Detectada em:** ciclo de correção por personas, em 28 de julho de 2026

## Qual foi o problema

Uma falha de rede ou do serviço de autenticação era apresentada como
“Credenciais inválidas ou conta não liberada”. A mensagem culpava a pessoa e
induzia troca de senha mesmo quando as mesmas credenciais autenticavam
diretamente no Supabase.

## Como ocorreu

`app/actions/auth.ts` tratava qualquer valor em `error` como a mesma causa. A
ação também não cercava exceções lançadas pelo transporte, portanto uma falha
de `fetch` podia escapar do fluxo de mensagem pública.

## Por que aconteceu

O código reduziu falhas de domínio, limite de uso e infraestrutura a um único
booleano. A documentação atual do Supabase Auth distingue erros da API por
`code` estável e expõe `status`; mensagens internas não são contrato de
programação.

Referências consultadas:

- https://supabase.com/docs/guides/auth/debugging/error-codes
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword

## Como foi detectado

O defeito D3 foi reconfirmado comparando a mensagem do login com a autenticação
direta bem-sucedida. O teste negativo reproduziu cinco famílias: credencial
inválida, e-mail não confirmado, limite de tentativas, erro 5xx e falha de rede.

Não foi detectado antes porque não existia teste da tradução de erro de login;
o teste funcional exercitava apenas o caminho feliz.

## Qual foi a solução

`lib/auth-errors.ts` passou a centralizar a tradução:

- `invalid_credentials` informa e-mail ou senha inválidos;
- `email_not_confirmed` orienta confirmação;
- código de limite ou HTTP 429 pede espera;
- erro 5xx, `unexpected_failure`, erros de transporte e `TypeError` informam
  indisponibilidade do serviço;
- o log contém apenas código, status e classe, nunca e-mail, senha ou mensagem
  interna.

`signIn` trata tanto erros devolvidos quanto exceções lançadas e usa a mesma
classificação.

## Varredura e ocorrências equivalentes

A busca por mensagens de credencial encontrou apenas `app/actions/auth.ts`. As
demais ações já usam tradução de domínio ou o helper de erro público, mas
continuam sujeitas a auditorias específicas de seu contexto.

## Prevenção automática

`tests/auth-errors.test.ts` executa as cinco famílias de causa. O teste falha se
indisponibilidade voltar a ser descrita como credencial inválida.

## Limitações da prevenção

O catálogo de códigos pode crescer. Códigos desconhecidos recebem mensagem
neutra; quando um novo código exigir orientação própria, ele deve entrar com
teste. O teste não substitui observabilidade do serviço nem inspeção dos logs do
Supabase em falhas 5xx.
