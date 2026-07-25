#!/usr/bin/env python3
from pathlib import Path
import hashlib,re,yaml
ROOT=Path(__file__).resolve().parents[1]
def main():
 d=yaml.safe_load((ROOT/'ARTIFACT-METADATA.yaml').read_text()); errors=[]; ids=set(); paths=set()
 for x in d.get('items',[]):
  if not re.fullmatch(r'ART-[0-9]{5}',x.get('artifact_id','')): errors.append(f'INVALID_ID:{x.get("artifact_id")}')
  if x['artifact_id'] in ids: errors.append(f'DUPLICATE_ID:{x["artifact_id"]}')
  if x['path'] in paths: errors.append(f'DUPLICATE_PATH:{x["path"]}')
  ids.add(x['artifact_id']); paths.add(x['path']); p=ROOT/x['path']
  if not p.is_file(): errors.append(f'MISSING:{x["path"]}')
  elif hashlib.sha256(p.read_bytes()).hexdigest()!=x['sha256']: errors.append(f'HASH_MISMATCH:{x["path"]}')
  for key in ('release_id','status','effective_at','sha256'):
   if not x.get(key): errors.append(f'MISSING_FIELD:{x["path"]}:{key}')
 exclusions=d.get('exclusions',{}); expected=set()
 for p in ROOT.rglob('*'):
  if not p.is_file(): continue
  rel=p.relative_to(ROOT).as_posix()
  if rel in exclusions.get('exact',[]) or any(rel.startswith(x) for x in exclusions.get('prefixes',[])): continue
  expected.add(rel)
 if expected!=paths: errors.append(f'COVERAGE missing={sorted(expected-paths)} extra={sorted(paths-expected)}')
 if errors: print('ARTIFACT_LIFECYCLE_RESULT: FAIL'); print('\n'.join(errors)); return 1
 print(f'ARTIFACT_LIFECYCLE_RESULT: PASS artifacts={len(paths)}'); return 0
if __name__=='__main__': raise SystemExit(main())
