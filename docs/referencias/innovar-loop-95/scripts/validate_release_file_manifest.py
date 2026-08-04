#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
MF = ROOT / 'MANIFEST.json'
BAD_PARTS = {'__pycache__', '.pytest_cache', 'node_modules'}
BAD_SUFFIXES = {'.pyc', '.pyo', '.tmp'}


def main() -> int:
    doc = json.loads(MF.read_text(encoding='utf-8'))
    errors: list[str] = []
    exclusions = set(doc.get('exclusions', []))
    entries = doc.get('files', [])
    seen: set[str] = set()
    for row in entries:
        rel = row.get('path')
        if not isinstance(rel, str) or rel in seen:
            errors.append(f'DUPLICATE_OR_INVALID_PATH:{rel}')
            continue
        seen.add(rel)
        path = ROOT / rel
        if not path.is_file():
            errors.append(f'MISSING:{rel}')
            continue
        if path.stat().st_size != row.get('bytes'):
            errors.append(f'SIZE_MISMATCH:{rel}')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != row.get('sha256'):
            errors.append(f'HASH_MISMATCH:{rel}')
    expected = {
        p.relative_to(ROOT).as_posix()
        for p in ROOT.rglob('*')
        if p.is_file()
        and p.relative_to(ROOT).as_posix() not in exclusions
        and not any(part in BAD_PARTS for part in p.relative_to(ROOT).parts)
        and p.suffix.lower() not in BAD_SUFFIXES
    }
    for rel in sorted(expected - seen):
        errors.append(f'UNLISTED:{rel}')
    for rel in sorted(seen - expected):
        errors.append(f'EXTRA:{rel}')
    if doc.get('file_count') != len(entries):
        errors.append('FILE_COUNT_MISMATCH')
    if errors:
        print('RELEASE_FILE_MANIFEST_RESULT: FAIL')
        print('\n'.join(errors))
        return 1
    print(f'RELEASE_FILE_MANIFEST_RESULT: PASS files={len(seen)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
