#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import hashlib, json, yaml
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'MANIFEST.json'
EXCLUDE = {
    'MANIFEST.json',
    'SHA256SUMS.txt',
    'audit/round2/ROUND2-FILE-INVENTORY.json',
    'remediation/ROUND2-CHANGE-MANIFEST.json',
}
BAD_PARTS = {'__pycache__', '.pytest_cache', 'node_modules'}
BAD_SUFFIXES = {'.pyc', '.pyo', '.tmp'}


def eligible(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return (
        path.is_file()
        and rel not in EXCLUDE
        and not any(part in BAD_PARTS for part in path.relative_to(ROOT).parts)
        and path.suffix.lower() not in BAD_SUFFIXES
    )


def main() -> int:
    rows = []
    for path in sorted((p for p in ROOT.rglob('*') if eligible(p)), key=lambda p: p.relative_to(ROOT).as_posix()):
        rows.append({
            'path': path.relative_to(ROOT).as_posix(),
            'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    doc = {
        'schema_version': 2,
        'release_id': yaml.safe_load((ROOT/'RELEASE-MANIFEST.yaml').read_text(encoding='utf-8'))['release_id'],
        'generated_at_utc': datetime.now(timezone.utc).isoformat(),
        'scope': 'release files excluding circular/derived integrity indexes',
        'exclusions': sorted(EXCLUDE),
        'file_count': len(rows),
        'files': rows,
    }
    OUT.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'RELEASE_FILE_MANIFEST_GENERATED files={len(rows)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
