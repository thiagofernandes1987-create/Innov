#!/usr/bin/env python3
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'SHA256SUMS.txt'
def main():
    rows=[]
    for p in sorted(x for x in ROOT.rglob('*') if x.is_file() and x!=OUT):
        rel=p.relative_to(ROOT).as_posix(); digest=hashlib.sha256(p.read_bytes()).hexdigest(); rows.append(f'{digest}  ./{rel}')
    OUT.write_text('\n'.join(rows)+'\n',encoding='utf-8')
    print(f'SHA256_MANIFEST_GENERATED {len(rows)}')
if __name__=='__main__': main()
