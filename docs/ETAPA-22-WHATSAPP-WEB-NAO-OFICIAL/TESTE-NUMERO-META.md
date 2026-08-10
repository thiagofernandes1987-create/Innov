# Teste controlado do número temporário da Meta

## Objetivo

Validar a integração oficial Meta Cloud API com o número temporário/sandbox fornecido pela Meta, sem utilizar número comercial, sessão Baileys ou envio autônomo de IA.

## Escopo desta execução

1. validar o `phone_number_id` cadastrado exclusivamente como `WHATSAPP_TEST_PHONE_NUMBER_ID`;
2. enviar uma única mensagem baseada no template de teste `hello_world` ao destinatário cadastrado como `WHATSAPP_TEST_RECIPIENT`;
3. registrar somente evidência sanitizada: hashes, últimos quatro dígitos e código de erro do provider;
4. não persistir token, telefone completo ou ID completo da mensagem;
5. não usar fallback para conta, contato ou número de produção;
6. não conectar o runtime WhatsApp Web/Baileys;
7. não liberar piloto ou produção com base apenas na aceitação do provider.

## Variáveis protegidas

O ambiente GitHub `homologation` deve possuir:

- `WHATSAPP_ACCESS_TOKEN`;
- `WHATSAPP_TEST_PHONE_NUMBER_ID`;
- `WHATSAPP_TEST_RECIPIENT`.

O workflow fixa o modo de teste e a autorização de uma única mensagem somente na execução explicitamente disparada. Ausência de qualquer variável bloqueia a chamada antes do envio.

## Evidência esperada

O arquivo `EVIDENCIA-NUMERO-TESTE-META-LATEST.json` diferencia:

- configuração ausente ou inválida;
- rejeição sanitizada pela Graph API;
- mensagem aceita pelo provider;
- receipt de entrega observado;
- webhook inbound observado.

Aceitação pela Graph API não comprova entrega ao aparelho. Delivery receipt e webhook inbound permanecem requisitos separados.

## Estado de autorização

- número comercial: não autorizado;
- Baileys real: não utilizado;
- IA: `DRAFT_ONLY`;
- produção: `NOT_AUTHORIZED`;
- merge: não executado.
