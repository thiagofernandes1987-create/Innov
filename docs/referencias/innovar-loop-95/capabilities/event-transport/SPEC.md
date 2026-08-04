# Event Transport — Especificação vertical
## Semântica
Transactional outbox, entrega at-least-once e consumidores idempotentes. Exactly-once não é prometido.
## Atomicidade
A mutação do agregado e `append_domain_event_and_outbox` devem ocorrer na mesma transação PostgreSQL. Erro em qualquer insert aborta tudo.
## Publisher
Worker dedicado reivindica com lease e `SKIP LOCKED`, publica pelo Kafka REST Proxy do Redpanda e confirma usando ownership do lease.
## Inbox
Claim, complete e fail são funções SQL tenant-aware. Evento concluído não é reaplicado.
## Administração
DLQ possui listagem, replay e resolução sob `events.admin`, idempotência e motivo obrigatório.
## Compatibilidade
Gate backward compara schemas atuais com baseline versionada. Breaking change exige novo major topic.
## Operação
HPA escala pelo backlog `innovar_outbox_ready_messages`; game day mede perda, duplicação de efeito e RTO.
## Limites de evidência
Nesta versão, SQL foi validado estaticamente e o publisher contra um servidor HTTP de contrato. PostgreSQL, Redpanda e Helm não foram executados neste ambiente.
