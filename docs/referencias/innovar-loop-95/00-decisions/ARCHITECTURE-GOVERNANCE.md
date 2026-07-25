# Governança da especificação executável

## Fonte única

`INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md` é o documento mestre. Contratos formais têm precedência
sobre narrativa: SQL → OpenAPI/AsyncAPI/JSON Schema → statecharts → testes → ADRs → blueprint.

## Regra de alteração

Toda mudança estrutural deve registrar:

- requisito estável;
- decisão/ADR;
- contrato afetado;
- compatibilidade;
- migration plan;
- teste/evidência;
- atualização da matriz;
- atualização do blueprint.

## Gates

Uma capability não pode ser marcada como integrada sem contrato, implementação de referência e teste.
Documentação sem execução recebe no máximo o estado `FORMALIZED`.
