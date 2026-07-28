# Ledgers da auditoria APEX V5.2.5

Registro canônico e congelado da auditoria descrita em `docs/ETAPA-20-AUDITORIA-APEX-V525.md`.
Commit auditado: `30937ed6aba10d40f24641e9158bb686ab94876d`.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `R1/` | Índice de artefatos, ledger de evidências, ledger de achados, ledger de dimensões, manifesto de congelamento e handoff da rodada inicial. |
| `R2/` | Transações de mudança, ledger de remediação (incluindo a mudança revertida), ledger de validação e manifesto de congelamento. |
| `R3A/` | Índice cego, ledger de detecção determinística e achados provisórios da rodada cega isolada. |
| `R3B/` | Reconciliação, ledger final de achados, desfechos finais com riscos residuais e validação final. |
| `R4/` | Candidatos a vacina, padrões de sucesso e lacunas de capacidade. |
| `R1-01_DISCOVER_CAPABILITIES.json` | Sonda real de capacidades do ambiente de execução. |
| `R1-03_SQL_RLS_MAP.json` | Mapa de RLS, policies e funções por tabela, com expansão dos laços dinâmicos das migrations. |
| `R3A-02_ISOLATED_WORKERS.json` | Evidência de execução dos processos isolados da rodada cega. |
| `R3A-05_LIMITATION.json` | Limitação declarada sobre ausência de contexto de modelo fisicamente novo. |

## Verificação de integridade

Cada rodada possui um manifesto com o SHA-256 de seus ledgers:

```bash
cd docs/auditoria-apex-v525
python3 - <<'PY'
import hashlib, json, pathlib
for manifest in sorted(pathlib.Path('.').glob('*/*_FREEZE_MANIFEST.json')):
    payload = json.loads(manifest.read_text())
    for entry in payload['files']:
        local = manifest.parent / pathlib.Path(entry['path']).name
        actual = hashlib.sha256(local.read_bytes()).hexdigest() if local.is_file() else None
        print(f"{'OK ' if actual == entry['sha256'] else 'DIF'} {local}")
PY
```

`R2/ARTIFACT_INDEX_R2.yaml` não é versionado aqui por tamanho: é a impressão digital completa da árvore de trabalho, com 5,3 MB. Seu hash permanece registrado em `R2/R2_FREEZE_MANIFEST.json`, o que preserva a verificação sem carregar o arquivo para o repositório.

## Leitura

Estes arquivos são estado canônico congelado. O relatório em `docs/ETAPA-20-AUDITORIA-APEX-V525.md` é renderização, não fonte de verdade: em caso de divergência, os ledgers prevalecem.
