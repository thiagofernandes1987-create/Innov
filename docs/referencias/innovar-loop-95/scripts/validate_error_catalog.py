#!/usr/bin/env python3
from pathlib import Path
import sys,yaml
ROOT=Path(__file__).resolve().parents[1]
def main():
    cat=yaml.safe_load((ROOT/'00-decisions/error-catalog.yaml').read_text())['errors']
    api=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text())
    enum=set(api['components']['schemas']['Problem']['properties']['code'].get('enum',[]))
    canonical=set(cat); errors=[]
    if enum!=canonical:
        errors.append(f'PROBLEM_CODE_ENUM_DRIFT missing={sorted(canonical-enum)} extra={sorted(enum-canonical)}')
    statuses=set(api['components']['schemas']['Problem']['properties']['status'].get('enum',[]))
    expected={v['status'] for v in cat.values()}
    if statuses!=expected: errors.append(f'PROBLEM_STATUS_ENUM_DRIFT expected={sorted(expected)} actual={sorted(statuses)}')
    if errors:
        print('ERROR_CATALOG_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'ERROR_CATALOG_RESULT: PASS codes={len(canonical)}'); return 0
if __name__=='__main__': raise SystemExit(main())
