# Sprint W-16 — Plugins e automações governadas

## Contrato

`MessagePlugin` separa decisão de canal, provider e envio. O `MessagePluginPipeline` executa prioridades únicas em ordem crescente e interrompe no primeiro resultado diferente de `CONTINUE`.

Ordem padrão:

1. consentimento;
2. anti-spam;
3. qualificação;
4. status de obra;
5. documento canônico;
6. SAC;
7. handoff;
8. IA como último recurso.

## Governança

- consentimento não pode ser desativado;
- plugins dependem de permissão e feature flag;
- prioridades ativas não podem colidir;
- IA exige `MESSAGING_AI_DRAFT`, prioridade igual ou superior a 1000 e gera somente `DRAFT` com revisão humana;
- decisões são persistidas sem corpo da mensagem e permanecem imutáveis;
- nenhuma decisão executa envio diretamente.

## Persistência

A migration `20260804210000_stage22_message_plugins.sql` adiciona:

- `channel_message_plugin_policies`;
- `channel_message_plugin_decisions`;
- RPC de política;
- RPC de auditoria da decisão;
- RLS forçada e bloqueio de escrita direta.
