#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BAD_DIRS={'__pycache__','.pytest_cache','node_modules'}
BAD_SUFFIXES={'.pyc','.pyo','.tmp'}
def main():
    bad=[]
    for p in ROOT.rglob('*'):
        rel=p.relative_to(ROOT)
        if any(part in BAD_DIRS for part in rel.parts): bad.append(str(rel)); continue
        if p.is_file() and p.suffix in BAD_SUFFIXES: bad.append(str(rel))
    if bad:
        print('PACKAGE_HYGIENE_RESULT: FAIL'); print('\n'.join(sorted(set(bad)))); return 1
    print('PACKAGE_HYGIENE_RESULT: PASS'); return 0
if __name__=='__main__': raise SystemExit(main())
