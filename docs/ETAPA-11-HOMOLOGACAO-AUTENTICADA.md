# Etapa 11 — Homologação autenticada ponta a ponta

## Objetivo

Validar o fluxo real do Supabase usando as APIs oficiais de Auth, PostgREST e RPC, sem inserir usuários diretamente no schema `auth` e sem gravar credenciais no repositório.

## Contas de homologação

- Administrador: `admin@innov.eng.br`
- Cliente: `cliente@cliente.com`

As senhas temporárias ficam somente nos secrets `DEMO_ADMIN_PASSWORD` e `DEMO_CLIENT_PASSWORD` do ambiente GitHub `homologation`.

## Workflow

Arquivo: `.github/workflows/stage11-homologation.yml`

Execução manual:

1. Abra **Actions**.
2. Selecione **Stage 11 Homologation E2E**.
3. Clique em **Run workflow**.
4. Selecione a branch da Etapa 9/11.

## Secrets obrigatórios

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_CLIENT_PASSWORD`

O workflow define `ALLOW_INSECURE_DEMO_USERS=true` somente no ambiente isolado de homologação.

## Cobertura do executor

O script `scripts/run-stage11-e2e.mjs` executa:

- provisionamento idempotente das contas;
- login real do administrador e do cliente;
- criação de orçamento por RPC;
- custos direto, indireto, fixo e administrativo;
- markup, lucro, margem e ROI;
- congelamento e imutabilidade da versão;
- bloqueio de aprovação em AAL1;
- cadastro e verificação de TOTP temporário;
- confirmação de sessão AAL2;
- aprovação financeira;
- criação, liberação e aceite da proposta;
- ocultação do orçamento interno ao cliente;
- geração do contrato;
- liberação de documento contratual;
- assinatura sandbox;
- idempotência de envelope, signatário e eventos;
- criação e assinatura de aditivo;
- aplicação do aditivo pelo backend;
- conferência do valor consolidado;
- conferência de eventos de auditoria.

## Valores financeiros esperados

- Custo direto: R$ 5.500,00
- Custo indireto: R$ 1.000,00
- Custo fixo: R$ 500,00
- Taxa administrativa: R$ 250,00
- Custo-base: R$ 7.250,00
- Markup: 1,25
- Preço de venda: R$ 9.062,50
- Lucro estimado: R$ 1.812,50
- Margem bruta: 20%
- Capital investido: R$ 10.000,00
- ROI estimado: 18,125%
- Aditivo: R$ 1.000,00
- Valor contratual consolidado: R$ 10.062,50

## Limpeza

O executor usa identificadores exclusivos por execução e remove no bloco `finally`:

- envelopes, signatários e eventos de assinatura;
- aditivos e versões;
- contratos e versões;
- propostas, versões e aceites;
- aprovações, itens e versões de orçamento;
- modelo de markup;
- eventos de auditoria relacionados;
- fator TOTP temporário.

As duas contas e os cadastros-base de organização/cliente permanecem disponíveis para uso manual da homologação.

## Correção descoberta

A repetição de `create_sandbox_signature_envelope` reutilizava o envelope, mas poderia duplicar o signatário. A migration `20260719215500_stage11_signature_signer_idempotency.sql` adiciona unicidade por:

- envelope;
- e-mail normalizado;
- ordem de assinatura.

## Critério de aprovação

A Etapa 11 é considerada concluída quando o workflow apresenta `success` e o JSON final contém:

```json
{
  "ok": true,
  "security": {
    "clientBudgetHidden": true,
    "aal1Blocked": true,
    "aal2Verified": true
  },
  "workflow": {
    "proposalAccepted": true,
    "contractCompleted": true,
    "signerIdempotency": true,
    "eventIdempotency": true,
    "amendmentApplied": true
  }
}
```
