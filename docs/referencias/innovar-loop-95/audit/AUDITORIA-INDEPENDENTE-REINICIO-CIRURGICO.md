# Auditoria independente — reinício cirúrgico

## Veredito

A nota anterior de 62,8% não era sustentável. O pacote continha contradições que os testes vigentes não detectavam: evento com estratégia não suportada, função `SECURITY DEFINER` sem revogação pública e sem validação de quantidade, SDK com ETag fraco e Service Helm incompatível com labels/porta do Deployment. A cobertura foi recalculada para **59,3%**.

## Achados críticos corrigidos

1. **Drift API/evento:** `metadata.object.created.v1` aceitava `PROVISIONED_TABLE`, mas a API só suporta `JSONB_HYBRID`.
2. **Quota vulnerável:** `reserve_quota` aceitava valores negativos e permanecia executável por `PUBLIC`.
3. **Drift SDK/API:** o SDK emitia `W/"N"`, enquanto OpenAPI exige ETag forte `"N"`.
4. **Helm não roteável:** Service selecionava label inexistente e usava `targetPort: http` sem porta nomeada.
5. **Validador raso:** o PASS anterior não detectava nenhum dos quatro defeitos acima.

## Achados ainda abertos

- SQL não foi aplicado e pode conter falhas de ordem, privilégios ou comportamento transacional;
- RLS não foi exercitada com roles reais sem `BYPASSRLS`;
- OpenAPI/AsyncAPI não foram processados por ferramentas oficiais;
- máquinas XState não estão ligadas ao command handler nem ao banco;
- BDD é predominantemente descritivo e repetitivo;
- Helm segue sem render/install e a NetworkPolicy default-deny não possui políticas explícitas de tráfego de aplicação;
- não existe Terraform;
- não existe API de referência integrada;
- runbooks não foram exercitados.

## Limite da evidência

Os 19 testes aprovados demonstram coerência local selecionada. Não demonstram disponibilidade, segurança distribuída, isolamento real, entrega de eventos ou operação de produção.
