#!/usr/bin/env python3
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
def main():
 files=list((ROOT/'05-infra').rglob('*.y*ml'))+[ROOT/'.github/workflows/executable-spec-integration.yaml']; refs=[]
 for p in files:
  for n,line in enumerate(p.read_text(errors='ignore').splitlines(),1):
   m=re.search(r'(?:image:|docker://)\s*["\']?([^"\'\s}]+)',line)
   if m and '{{' not in m.group(1): refs.append((p.relative_to(ROOT).as_posix(),n,m.group(1)))
 unpinned=[x for x in refs if '@sha256:' not in x[2]]
 if unpinned:
  print('IMAGE_REFERENCE_RESULT: BLOCKED_EXTERNAL')
  for f,n,r in unpinned: print(f'{f}:{n}:{r}')
  return 77
 print(f'IMAGE_REFERENCE_RESULT: PASS refs={len(refs)}'); return 0
if __name__=='__main__': raise SystemExit(main())
