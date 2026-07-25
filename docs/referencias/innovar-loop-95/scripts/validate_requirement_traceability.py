#!/usr/bin/env python3
from pathlib import Path
import sys,yaml
ROOT=Path(__file__).resolve().parents[1]
REQ=ROOT/'00-decisions/requirements.yaml'
MAP=ROOT/'traceability/REQUIREMENT-EVIDENCE-MAP.yaml'
ALLOWED={'SPECIFIED','PARTIAL','PROVEN','BLOCKED'}

def main():
    canonical=yaml.safe_load(REQ.read_text(encoding='utf-8')).get('requirements',{})
    mapped=yaml.safe_load(MAP.read_text(encoding='utf-8')).get('requirements',{})
    errors=[]
    missing=sorted(set(canonical)-set(mapped)); extra=sorted(set(mapped)-set(canonical))
    if missing: errors.append('MISSING_REQUIREMENTS '+','.join(missing))
    if extra: errors.append('UNKNOWN_REQUIREMENTS '+','.join(extra))
    for rid,item in mapped.items():
        status=item.get('status')
        if status not in ALLOWED: errors.append(f'{rid}:INVALID_STATUS:{status}')
        ev=item.get('evidence',[])
        if isinstance(ev,str): ev=[ev]
        if not ev: errors.append(f'{rid}:NO_EVIDENCE')
        for rel in ev:
            if not (ROOT/rel).exists(): errors.append(f'{rid}:MISSING_EVIDENCE:{rel}')
        if status!='PROVEN' and not item.get('gap'): errors.append(f'{rid}:MISSING_GAP')
    print(f'REQUIREMENTS_CANONICAL {len(canonical)}')
    print(f'REQUIREMENTS_MAPPED {len(mapped)}')
    if errors:
        print('REQUIREMENT_TRACEABILITY_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print('REQUIREMENT_TRACEABILITY_RESULT: PASS'); return 0
if __name__=='__main__': raise SystemExit(main())
