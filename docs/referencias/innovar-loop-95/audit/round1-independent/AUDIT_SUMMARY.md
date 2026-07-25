# INNOVAR EXECUTABLE SPEC AUTO12
## Resumo Executivo da Auditoria — Rodada 1

**Parecer:** **NÃO APROVADO PARA DECLARAÇÃO DE PRONTIDÃO OPERACIONAL.**  
**Aprovado apenas como especificação executável em evolução, com validações estáticas e unitárias úteis.**

## Resultado quantitativo

- Arquivos auditados no inventário: **355/355**.
- Achados: **35**.
- Severidade: **6 críticos**, **18 altos**, **11 médios**.
- Testes Python reproduzidos: **70/70 PASS** na suíte `tests` e **8/8 PASS** em `bdd_steps`.
- BDD: **152 cenários**, apenas **38 corpos únicos**; **133** pertencem a grupos duplicados.
- Evidência externa: PostgreSQL, Redpanda, Helm/Kubernetes, XState npm e carga distribuída permanecem **BLOCKED**.

## Cinco riscos dominantes

1. **Integridade do pacote:** `SHA256SUMS.txt` possui 23 ausências e 5 divergências.
2. **Tenancy inconsistente:** `app.current_organization_id` e `app.tenant_id` coexistem em RLS diferentes.
3. **Cobertura BDD artificial:** 133 cenários duplicados e zero tags BDD correspondentes ao catálogo canônico.
4. **Campanha de 100 rodadas superestima execução:** 58 PASS sem evidence_path e 36 PASS por token/static/verified.
5. **Fonte canônica incorreta:** `STATUS.md` permanece em AUTO6 dentro do pacote AUTO12.

## Decisão de auditoria

A Rodada 2 deve iniciar pelas correções locais P0: fonte canônica, manifesto de hashes, tenancy, BDD/traceability, metodologia de evidência e segurança do workflow. Nenhum score global acima de 95% é sustentado por esta Rodada.
