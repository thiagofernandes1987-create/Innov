# Evidências — Sprint W-17

**Estado:** concluída no escopo sintético e de hardening  
**Data:** 04 de agosto de 2026

## Checklist

- [x] threat model STRIDE;
- [x] inventário de ativos;
- [x] fronteiras de confiança;
- [x] replay, command injection e prompt injection cobertos;
- [x] allowlist de ferramentas;
- [x] aprovação para escritas críticas;
- [x] redação estruturada de logs;
- [x] retenção e legal hold;
- [x] auditoria de acesso sensível;
- [x] testes cross-tenant sob papel `authenticated`;
- [x] resposta a comprometimento de sessão;
- [x] scanner de segredos;
- [x] SBOM do gateway.

## Evidência executável

Head funcional: `ba0e6839aef8c3d2a8b64adb257aef9f4ce5d978`.

- Messaging Incremental Loop `30941289549`: verde;
- CI `30941289739`: preflight e quality verdes;
- File Security E2E `30941289882`: verde;
- `messaging-threat-model-hardening-boundary-v1`: verde;
- `messaging-secret-scanner-v1`: verde, zero achados;
- 10 controles PostgreSQL W-17: verdes;
- suíte global, lint, typecheck, Python, gateway, container e Next.js: verdes.

## Exceção revisada do scanner

O valor fixo `Cookie: "security=true"` usado pelo downloader público da CAIXA foi inspecionado e classificado como marcador público de navegação, não credencial. A allowlist aceita somente esse literal exato; chaves privadas, JWT, bearer, tokens e atribuições secretas continuam bloqueados.

## Não executado

Nenhuma sessão, credencial, número, conexão, envio, incidente ou rotação real foi utilizado. Não houve deploy ou produção.
