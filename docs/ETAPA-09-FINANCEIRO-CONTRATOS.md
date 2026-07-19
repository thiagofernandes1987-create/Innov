# ETAPA 09 — Orçamentos, Propostas, Contratos e Assinaturas

**Versão:** 0.9.0  
**Data:** 19 de julho de 2026  
**Branch:** `feature/etapa-09-financeiro-contratos`  
**Estado:** implementação para revisão; implantação Supabase pendente

## 1. Fatia vertical

```text
cliente/oportunidade
→ orçamento versionado
→ cálculo financeiro server-side
→ validações e alçadas
→ proposta comercial em PDF
→ liberação e aceite do cliente
→ contrato versionado
→ assinatura eletrônica
→ aditivo
→ atualização do valor e prazo consolidados
→ auditoria
```

## 2. Orçamento

A implementação contempla:

- cadastro e versão V1;
- criação de novas versões;
- EAP, seções e itens;
- catálogo de custos e composições;
- custos diretos e indiretos;
- custos fixos e critérios de rateio;
- taxa administrativa;
- modelos e versões de BDI;
- markup multiplicador e divisor;
- preço de venda;
- margem;
- lucro estimado;
- capital investido;
- ROI;
- payback;
- necessidade máxima de caixa;
- cenários;
- memória de cálculo;
- congelamento e imutabilidade;
- aprovações e exceções.

## 3. Fórmulas

### BDI

```text
BDI =
[
  ((1 + AC + S + G + R) × (1 + DF) × (1 + L))
  ÷
  (1 - I)
] - 1
```

### Markup multiplicador

```text
preço = custo-base × fator
```

### Markup divisor

```text
fator = 1 ÷ (1 - tributos - comissões - despesas variáveis - margem desejada)
```

### Margem

```text
margem = (preço - custo-base) ÷ preço
```

### ROI

```text
ROI = lucro líquido estimado ÷ capital investido
```

Margem e markup permanecem indicadores distintos.

## 4. Validações

Regras iniciais:

- taxa administrativa duplicada no BDI;
- custos fixos rateados e incluídos novamente no BDI;
- lucro no BDI e margem repetida no markup divisor;
- ROI sem capital investido;
- preço abaixo do custo;
- margem abaixo da política;
- ROI abaixo da política;
- validações bloqueantes impedem congelamento e aprovação.

Exceções críticas exigem alçada, justificativa, auditoria e, quando configurado, MFA AAL2.

## 5. Imutabilidade

Depois de congelada, uma versão não pode alterar:

- itens;
- custos;
- modelos financeiros;
- BDI;
- markup;
- preço;
- margem;
- lucro;
- ROI;
- premissas;
- memória de cálculo.

Status e metadados de aprovação podem avançar. Mudança financeira exige nova versão.

## 6. Propostas

A proposta é derivada de orçamento aprovado e possui:

- versões;
- conteúdo editorial;
- valor comercial;
- validade;
- condições;
- prazo;
- garantias;
- inclusões e exclusões;
- PDF server-side;
- hash SHA-256;
- armazenamento privado;
- liberação explícita ao cliente;
- aceite ou rejeição vinculados à versão.

O PDF do cliente não contém custos internos, BDI detalhado, markup, margem, lucro ou ROI.

## 7. Contratos

A estrutura contempla:

- templates e variáveis;
- contrato e versões;
- partes e ordem de assinatura;
- PDF privado com hash;
- revisão interna;
- revisão do cliente;
- assinatura pendente;
- contrato assinado e ativo;
- valor original;
- valor de aditivos;
- valor consolidado.

Documentos enviados ou assinados são imutáveis.

## 8. Aditivos

Um aditivo registra:

- motivo;
- alteração de escopo;
- delta financeiro;
- delta de prazo;
- nova data final;
- orçamento de referência;
- versões;
- assinatura.

A aplicação ao contrato é idempotente. Um aditivo assinado não pode ser somado duas vezes.

## 9. Assinatura eletrônica

Foi criada arquitetura de adapter para:

- `sandbox`;
- Clicksign;
- ZapSign;
- DocuSign.

O provider `sandbox` é funcional somente para homologação e não possui validade jurídica externa.

O webhook implementa:

- HMAC SHA-256;
- timestamp;
- janela contra replay;
- idempotência por evento;
- Service Role somente no servidor;
- atualização de envelope e signatário;
- conclusão de contrato ou aditivo;
- auditoria.

Integrações reais dependem de credenciais e contrato com o provedor escolhido.

## 10. Portal do cliente

O cliente acessa somente:

- propostas próprias liberadas;
- preço e condições comerciais;
- contratos próprios liberados;
- aditivos próprios liberados;
- envelopes relacionados a documentos publicados;
- status de signatários.

O cliente nunca acessa:

- custos;
- composições;
- custos fixos;
- taxa administrativa interna;
- BDI interno;
- markup;
- margem;
- lucro;
- ROI;
- validações e alçadas internas;
- documentos de outro cliente.

## 11. Segurança

- Supabase Auth;
- autorização server-side;
- proxy de sessão;
- RLS;
- separação explícita entre membro interno e cliente;
- buckets privados;
- URLs assinadas previstas para download;
- MFA AAL2 em ações críticas;
- separação de funções;
- Service Role somente em módulo `server-only`;
- logs sem conteúdo integral de documentos;
- auditoria append-only.

## 12. Rotas

### Internas

```text
/app/orcamentos
/app/orcamentos/novo
/app/orcamentos/[id]
/app/propostas
/app/contratos
/app/aditivos
/app/assinaturas
```

### Cliente

```text
/cliente/orcamentos
/cliente/contratos
/cliente/aditivos
/cliente/assinaturas
```

### APIs

```text
POST /api/proposals/[versionId]/pdf
POST /api/contracts/[versionId]/pdf
POST /api/signatures/webhook
```

## 13. Migrations

```text
20260719230000_stage9_financial_contracts.sql
20260719231500_stage9_workflows.sql
20260719232500_stage9_client_signature_policies.sql
20260719233500_stage9_frozen_version_rules.sql
20260719234000_stage9_apply_amendment.sql
20260719234500_stage9_security_hardening.sql
```

## 14. Homologação

Contas solicitadas:

- `admin@innov.eng.br` — `SUPER_ADMIN`;
- `cliente@cliente.com` — `CLIENTE`.

As senhas temporárias não fazem parte do código ou da interface. O provisionamento deve ocorrer pelo Supabase ou por script server-side restrito a homologação.

## 15. Pendências antes de produção

- aplicar migrations em ambiente de homologação;
- gerar tipos do Supabase;
- configurar e-mail e MFA;
- criar as contas de teste;
- testar RLS com JWT real;
- testar PDFs e URLs assinadas;
- selecionar provider jurídico real;
- configurar segredo do webhook;
- testar replay e idempotência;
- revisar templates com advogado;
- revisar regras fiscais com contador;
- executar lint, typecheck, testes e build;
- realizar pentest.
