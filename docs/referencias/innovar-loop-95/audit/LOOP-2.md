# Loop 2 — Contratos executáveis

## Correções

- endpoint formal de transição adicionado ao OpenAPI;
- JSON Schema específico de transition request;
- evento de lifecycle adicionado ao AsyncAPI;
- schema do evento criado;
- statechart específico de Object Definition criado;
- registry inicial de migrations de statechart criado.

## Auditoria

A imutabilidade publicada agora possui contrato específico, mas ainda falta trigger/handler executado e
teste integrado. O OpenAPI permanece multi-file; foi validado estruturalmente, não por ferramenta externa.
