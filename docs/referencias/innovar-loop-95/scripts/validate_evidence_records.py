#!/usr/bin/env python3
from pathlib import Path
import json,sys
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((ROOT/'schemas/evidence-record.schema.json').read_text())

def main():
    errors=[]; count=0
    for p in sorted((ROOT/'audit/evidence-records').glob('*.json')):
        count+=1
        try: doc=json.loads(p.read_text(encoding='utf-8'))
        except Exception as e: errors.append(f'{p.name}:JSON:{e}'); continue
        for e in Draft202012Validator(SCHEMA).iter_errors(doc):
            errors.append(f'{p.name}:{e.json_path}:{e.message}')
        for rel in doc.get('source_artifacts',[]):
            if not (ROOT/rel).exists(): errors.append(f'{p.name}:MISSING_SOURCE:{rel}')
        if p.stat().st_size==0: errors.append(f'{p.name}:EMPTY')
        if doc.get('status')=='BLOCKED_EXTERNAL':
            if doc.get('execution_level')!='NOT_EXECUTED': errors.append(f'{p.name}:BLOCKED_MUST_BE_NOT_EXECUTED')
            if not doc.get('required_execution_level'): errors.append(f'{p.name}:BLOCKED_MISSING_REQUIRED_LEVEL')
        if doc.get('status')=='PASS' and doc.get('execution_level')=='NOT_EXECUTED':
            errors.append(f'{p.name}:PASS_CANNOT_BE_NOT_EXECUTED')
    for p in sorted((ROOT/'audit').rglob('*.txt')):
        if p.stat().st_size==0: errors.append(f'ZERO_BYTE_AUDIT_EVIDENCE:{p.relative_to(ROOT)}')
    if count==0: errors.append('NO_EVIDENCE_RECORDS')
    if errors:
        print('EVIDENCE_RECORDS_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'EVIDENCE_RECORDS_RESULT: PASS records={count}'); return 0
if __name__=='__main__': raise SystemExit(main())
