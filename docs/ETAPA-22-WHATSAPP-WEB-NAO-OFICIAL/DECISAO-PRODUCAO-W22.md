# Decisão final de produção — Etapa 22

**Decisão:** `HOLD`  
**Produção:** `NOT_AUTHORIZED`  
**Piloto real:** `NOT_EXECUTED`  
**Homologação real:** `NOT_EXECUTED`  
**Data:** 04 de agosto de 2026

## Fundamentação

A base técnica está implementada e testada com fixtures, PostgreSQL local, doubles, containers sem rede e chaos sintético. Isso reduz riscos de arquitetura e implementação, mas não demonstra compatibilidade operacional com um serviço externo real, estabilidade de sessão real, conformidade contratual, custo operacional real nem autorização para usar um cliente não oficial.

A promoção é bloqueada pela ausência cumulativa de:

1. revisão jurídica e de privacidade da estratégia e da árvore transitiva;
2. decisão de KMS/HSM para credenciais reais;
3. número dedicado e formalmente autorizado;
4. organização e usuários de homologação aprovados;
5. repetição dos testes P0 em ambiente real autorizado;
6. piloto restrito com SLOs, abort criteria e responsáveis;
7. revisão técnica e de segurança do PR `#40`.

## Regras vigentes

- Meta Cloud permanece o único runtime de WhatsApp implementado e autorizado no monólito;
- `WHATSAPP_WEB_BAILEYS` permanece planejado/experimental e não registrado no bootstrap;
- o gateway continua fail-closed e usa cliente fake por padrão;
- IA permanece `DRAFT_ONLY` e nunca envia automaticamente;
- campanhas permanecem desabilitadas;
- nenhuma conexão, sessão, QR, pairing, número, deploy ou tráfego real está autorizado;
- uma decisão futura de `GO` precisa ser explícita, separada e apoiada por evidência real.

## Critério de reabertura

A decisão só pode sair de `HOLD` depois que todos os bloqueadores externos forem registrados como aprovados com responsável, data, escopo e evidência. A ausência de um único gate mantém `NOT_AUTHORIZED`.
