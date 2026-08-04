# VACINA-033 — Simulador e provedor concluem o mesmo domínio

**Estado:** vigente  
**Detectada em:** campanha QA de personas, 28 de julho de 2026

## Qual foi o problema

O envelope sandbox chegava a `COMPLETED`, mas o contrato permanecia `DRAFT`.
Assim, a assinatura aparentava sucesso e a obra não podia ser criada a partir
do contrato.

## Como ocorreu

O webhook do provedor atualizava envelope, signatários, versão contratual,
contrato e aditivo diretamente no código da rota. O simulador sandbox atualizava
somente envelope e eventos. Os dois caminhos representavam o mesmo fato de
negócio com efeitos diferentes.

## Por que aconteceu

A transição de estado foi duplicada por adaptador de integração, em vez de
pertencer a uma RPC de domínio única. O E2E anterior terminava na assinatura e
não tentava criar a obra, por isso não detectava o contrato ainda em rascunho.

## Como foi detectado

O cenário normal continuou depois da assinatura até
`create_project_from_contract`. A pré-condição recusou o contrato `DRAFT`,
expondo a divergência.

## Qual foi a solução

- criada `complete_signature_business_state(uuid)` como transação única;
- contrato, versão, signatários e aditivo são concluídos no banco;
- o sandbox chama a RPC ao receber `COMPLETED`;
- o webhook chama a mesma RPC e trata falha explicitamente;
- o webhook deixou de ignorar erros de atualização de signatário, contrato ou
  auditoria.

## Varredura e ocorrências equivalentes

Foram revisados:

- assinatura de contrato;
- assinatura de aditivo;
- simulador sandbox;
- webhook de provedor;
- aplicação de aditivo assinado;
- criação de obra a partir de contrato.

## Prevenção automática

O cenário transacional da campanha QA não termina no envelope. Ele exige:

```text
envelope COMPLETED
→ contrato SIGNED
→ obra criada
→ recebível financeiro criado
```

A regressão também será incorporada ao runner autenticado da Etapa 11.

## Limitações da prevenção

O teste sandbox prova a transição de domínio sem validar entrega real do
provedor externo, latência, reenvio de webhook ou artefato assinado por um
terceiro. Esses pontos permanecem testes de integração separados.
