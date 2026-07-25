# Runbook — override administrativo

Não falsificar aprovação.

Criar `administrative_override` com:

- target;
- action;
- original_state;
- resulting_state;
- justification;
- incident_id;
- dois aprovadores;
- evidência MFA;
- expiração;
- evento de auditoria.

Pré-condições:

1. incidente aberto;
2. suporte com capability `platform.break_glass`;
3. MFA recente;
4. aprovação de segunda pessoa;
5. motivo mínimo de 20 caracteres;
6. command revalida invariantes não dispensáveis.

Overrides financeiros, identitários e de retenção legal podem ser proibidos.
