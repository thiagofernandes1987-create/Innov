#!/usr/bin/env python3
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]
def main():
 doc=yaml.safe_load((ROOT/'03-statecharts/STATE-MIGRATION-REGISTRY.yaml').read_text()); errors=[]
 sources={p.relative_to(ROOT).as_posix() for p in (ROOT/'03-statecharts/xstate').glob('*.machine.ts')}
 registered={v.get('source') for v in doc.get('machines',{}).values()}
 if sources!=registered: errors.append(f'SOURCE_COVERAGE missing={sorted(sources-registered)} extra={sorted(registered-sources)}')
 for mid,m in doc.get('machines',{}).items():
  for key in ['runtime_id','current_version','migrations','persistence','unknown_version_policy','snapshot_schema']:
   if key not in m: errors.append(f'{mid}:MISSING:{key}')
 if errors:
  print('STATECHART_REGISTRY_RESULT: FAIL'); print('\n'.join(errors)); return 1
 print(f'STATECHART_REGISTRY_RESULT: PASS machines={len(sources)}'); return 0
if __name__=='__main__': raise SystemExit(main())
