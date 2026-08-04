# Sprint W-04 — Modelo persistente multiprovider

## Decisão arquitetural

As relações existentes da Etapa 22 continuam sendo o domínio operacional único:

- `whatsapp_accounts`;
- `whatsapp_contacts`;
- `whatsapp_conversations`;
- `whatsapp_content_bindings`;
- `whatsapp_messages`;
- `whatsapp_message_status_events`;
- `whatsapp_webhook_events`.

A W-04 não cria novas tabelas de contatos, conversas ou mensagens. As relações `channel_*` armazenam apenas infraestrutura técnica compartilhada entre providers.

## Evolução das relações existentes

| Relação | Evolução aditiva |
|---|---|
| `whatsapp_accounts` | provider, identificador externo, estado, metadata e versão de configuração |
| `whatsapp_messages` | provider e conta externa explícitos; identificador externo escopado por provider e conta |
| `whatsapp_webhook_events` | provider e conta externa explícitos |
| demais relações | permanecem como fontes canônicas de domínio |

Os registros Meta existentes recebem backfill a partir de `phone_number_id` e da conta ligada à conversa. Nenhuma entidade histórica é recriada.

## Relações técnicas

| Relação | Responsabilidade |
|---|---|
| `channel_contact_identities` | aliases externos ligados ao contato existente |
| `channel_commands` | comandos idempotentes ligados à conversa e mensagem canônicas |
| `channel_outbox_events` | publicação durável de comandos |
| `channel_inbox_events` | eventos recebidos, deduplicados e sanitizados |
| `channel_delivery_attempts` | ledger de tentativas e classificação de falhas |
| `channel_dead_letters` | falhas que exigem resolução ou reprocessamento controlado |
| `channel_provider_rollbacks` | registro de rollback lógico de uma conta de canal |

## Invariantes

1. Toda identidade externa referencia um contato existente.
2. Organização, conta, provider e conta externa devem coincidir com a entidade canônica.
3. Um comando referencia uma conversa existente e, quando aplicável, uma mensagem existente.
4. Um comando produz exatamente um evento inicial de outbox.
5. A idempotência é escopada por organização, provider e conta externa.
6. A inbox recebe apenas uma representação sanitizada do evento.
7. As tabelas técnicas usam RLS forçada e não aceitam escrita direta de usuários autenticados.
8. O rollback cancela trabalho pendente e preserva identidades, mensagens e auditoria.
9. Um provider planejado não se torna runtime por existir no contrato ou no schema.

## Rollback lógico

A função `rollback_channel_provider_projection`:

- desativa a conta;
- altera seu estado para `ROLLED_BACK`;
- incrementa a versão de configuração;
- cancela comandos e eventos de outbox ainda executáveis;
- registra justificativa e contagens;
- mantém o histórico intacto.

## Limites da sprint

Esta sprint cria somente a base persistente. Não cria gateway, adapter Baileys, sessão, QR, pairing, worker permanente, número real, automação ou liberação de produção.
