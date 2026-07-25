# Auditoria independente — ciclo atual

## Veredito

A especificação avançou em evidência local, mas continua distante de uma plataforma executável integrada. O maior risco dos relatórios anteriores era misturar quantidade documental, compilação e execução real. Este ciclo mantém essas classes separadas.

## Achados críticos

1. **BDD inflado por repetição:** 136 cenários não representam 136 comportamentos únicos. Os arquivos de idempotência e tenancy repetem o mesmo comportamento em variantes numeradas. Eles permanecem descritivos; apenas sete comportamentos possuem teste local nesta rodada.
2. **SQL não executado:** migrations, triggers e RLS foram apenas analisados estaticamente. Não existe evidência de aplicação do zero, rollback, tenant crossing ou concorrência em PostgreSQL.
3. **API não integrada:** OpenAPI tem coerência local, mas não há servidor HTTP que prove autenticação, ETag, idempotência, transação e outbox no mesmo fluxo.
4. **Eventos não integrados:** AsyncAPI e schemas não provam entrega, ordenação, retry, DLQ, replay ou compatibilidade de consumidores.
5. **IaC incompleta:** Helm não foi renderizado; Terraform está ausente. Docker Compose não substitui instalação de produção.
6. **SDK manual:** compila, porém não é gerado do contrato e não possui teste contra servidor.
7. **Runbooks rasos:** não há evidência de exercício, tempos medidos, restore ou pós-incidente.
8. **Cobertura não deve ser derivada de contagem de arquivos:** a régua canônica agora proíbe isso explicitamente.

## Correções deste ciclo

- checklist canônico de cobertura criado;
- runtime de referência mínimo criado para lifecycle, tenant e idempotência;
- sete testes de aceitação locais adicionados;
- validador alterado para executar toda a suíte `test_*.py`;
- matriz atualizada com evidência e gap por item;
- relatórios antigos conflitantes movidos para histórico;
- cobertura recalculada sem considerar os 136 cenários como executados.

## Limite da evidência

O runtime de referência é propositalmente pequeno e em memória. Ele prova coerência comportamental local, não prova PostgreSQL, HTTP, Kafka, Redis, segurança real ou operação distribuída.
