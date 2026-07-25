#!/usr/bin/env python3
from pathlib import Path
import hashlib,re
ROOT=Path(__file__).resolve().parents[1]; MF=ROOT/'SHA256SUMS.txt'
def main():
    errors=[]; seen=set()
    for n,line in enumerate(MF.read_text(encoding='utf-8').splitlines(),1):
        m=re.fullmatch(r'([a-f0-9]{64})  \./(.+)',line)
        if not m: errors.append(f'INVALID_LINE:{n}'); continue
        expected,rel=m.groups(); p=ROOT/rel
        if rel in seen: errors.append(f'DUPLICATE:{rel}')
        seen.add(rel)
        if not p.is_file(): errors.append(f'MISSING:{rel}'); continue
        actual=hashlib.sha256(p.read_bytes()).hexdigest()
        if actual!=expected: errors.append(f'MISMATCH:{rel}')
    expected_files={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p!=MF}
    for rel in sorted(expected_files-seen): errors.append(f'UNLISTED:{rel}')
    for rel in sorted(seen-expected_files): errors.append(f'EXTRA:{rel}')
    if errors:
        print('SHA256_MANIFEST_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'SHA256_MANIFEST_RESULT: PASS files={len(seen)}'); return 0
if __name__=='__main__': raise SystemExit(main())
