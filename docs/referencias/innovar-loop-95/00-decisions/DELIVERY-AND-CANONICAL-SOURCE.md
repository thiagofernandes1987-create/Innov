# Entrega e fonte canônica

A identidade vigente é definida exclusivamente por `RELEASE-MANIFEST.yaml`. `STATUS.md` é uma projeção humana e deve concordar com esse manifesto.

## Regras

1. O pacote deve conter uma única release `CANONICAL`.
2. Evidência histórica não pode ser usada como evidência corrente.
3. `SHA256SUMS.txt` deve cobrir toda a árvore regular, exceto ele próprio.
4. Arquivos vazios, ausentes ou sem metadados mínimos são evidência inválida.
5. `PASS` exige nível de execução explícito e caminho de evidência verificável.
6. Dependência externa indisponível recebe `BLOCKED_EXTERNAL`, nunca `PASS`.
7. O ZIP só pode ser criado após `validate_round2.py` e `verify_sha256_manifest.py` retornarem zero.
