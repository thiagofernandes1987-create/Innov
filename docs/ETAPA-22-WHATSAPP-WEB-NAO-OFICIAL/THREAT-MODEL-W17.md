# Sprint W-17 — Threat model STRIDE

## Ativos

Credenciais de sessão, conteúdo de mensagens, identidades, mídia, documentos canônicos, contexto de IA, eventos de auditoria e segredos de assinatura.

## Fronteiras de confiança

1. cliente público → aplicação;
2. aplicação → Supabase;
3. aplicação → gateway;
4. gateway → adapter;
5. adapter → provider externo;
6. quarentena → storage limpo;
7. fontes canônicas → contexto de IA;
8. operador → escrita crítica.

## STRIDE

| Categoria | Cenário principal | Controle |
|---|---|---|
| Spoofing | comando interno forjado | HMAC, timestamp, nonce e replay guard |
| Tampering | envelope alterado | versão, hash e persist-before-dispatch |
| Repudiation | negação de aprovação | evento imutável com ator, razão e prazo |
| Information disclosure | segredo em banco/log | envelope encryption, redaction e auditoria |
| Denial of service | flood de mensagens/mídia/IA | limites, quotas, backpressure e circuit breaker |
| Elevation of privilege | documento instrui ferramenta | conteúdo não confiável, allowlist e aprovação crítica |

## Controles adicionais

- allowlist fechada de ferramentas;
- escrita crítica com aprovação de uso único;
- políticas de retenção e legal hold;
- auditoria de leitura de recursos sensíveis;
- scanner de segredos sobre código de runtime;
- SBOM determinística do gateway;
- testes cross-tenant;
- nenhum segredo ou corpo bruto em eventos de segurança.
