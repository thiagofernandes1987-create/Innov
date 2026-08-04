# Auditoria independente AUTO11

## Parecer

A especificação ganhou controles executáveis relevantes de governança, mas ainda deve ser classificada como **PARTIAL**. A documentação deixou de ser a principal limitação; o gargalo é evidência integrada.

## Achados

### Alta prioridade

1. 132 de 152 cenários Gherkin continuam sem binding comprovado.
2. Nenhum requisito canônico possui status `PROVEN` no mapa requisito-evidência.
3. Migrations e triggers 0010–0012 são verificadas estaticamente, não executadas em PostgreSQL.
4. O SCI é capability-scoped; não pode ser apresentado como cobertura global.

### Média prioridade

1. O gate OpenAPI/AsyncAPI ainda é majoritariamente estrutural e sem servidor implantado.
2. O SDK determinístico evita drift do artefato gerado, mas não prova compatibilidade de cliente contra serviço.
3. Os manifests Kubernetes são endurecidos, porém não passaram por API Server admission.

## Conclusão

Os valores 79,4% e 85,6% são defensáveis apenas nas duas capabilities avaliadas e somente sob o modelo de facetas atual. Não há base para declarar 95% ou readiness de produção.
