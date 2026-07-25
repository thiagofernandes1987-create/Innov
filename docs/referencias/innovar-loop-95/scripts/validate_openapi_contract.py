#!/usr/bin/env python3
from pathlib import Path
import re,yaml
ROOT=Path(__file__).resolve().parents[1]
METHODS={'get','post','put','patch','delete','options','head','trace'}

def resolve_internal(doc,ref):
    cur=doc
    for part in ref[2:].split('/'):
        cur=cur[part.replace('~1','/').replace('~0','~')]
    return cur

def main():
    doc=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text(encoding='utf-8')); errors=[]; operation_ids=[]
    if doc.get('openapi')!='3.1.0': errors.append('VERSION_NOT_3_1_0')
    for path,item in doc.get('paths',{}).items():
        inherited={p.get('name') for p in item.get('parameters',[]) if isinstance(p,dict) and p.get('in')=='path'}
        expected=set(re.findall(r'{([^}]+)}',path))
        for method,op in item.items():
            if method.lower() not in METHODS: continue
            oid=op.get('operationId')
            if not oid: errors.append(f'{method.upper()} {path}:MISSING_OPERATION_ID')
            else: operation_ids.append(oid)
            local=inherited|{p.get('name') for p in op.get('parameters',[]) if isinstance(p,dict) and p.get('in')=='path'}
            if local!=expected: errors.append(f'{method.upper()} {path}:PATH_PARAMETERS expected={sorted(expected)} actual={sorted(local)}')
            effective_security=op.get('security',doc.get('security',[]))
            if effective_security:
                responses=op.get('responses',{})
                for code in ('401','403'):
                    if code not in responses: errors.append(f'{oid}:MISSING_{code}')
    if len(operation_ids)!=len(set(operation_ids)): errors.append('DUPLICATE_OPERATION_IDS')
    if 'getRecord' not in operation_ids: errors.append('GET_RECORD_OPERATION_MISSING')
    text=(ROOT/'01-api/openapi.yaml').read_text(encoding='utf-8')
    for ref in re.findall(r"\$ref:\s*['\"]?([^'\"\s}]+)",text):
        try:
            if ref.startswith('#/'): resolve_internal(doc,ref)
            elif ref.startswith('./'):
                target=(ROOT/'01-api'/ref.split('#',1)[0]).resolve()
                if not target.is_file(): errors.append(f'BROKEN_EXTERNAL_REF:{ref}')
        except Exception as e: errors.append(f'BROKEN_INTERNAL_REF:{ref}:{e}')
    problem=doc.get('components',{}).get('schemas',{}).get('Problem',{})
    if problem.get('additionalProperties') is not False: errors.append('PROBLEM_SCHEMA_NOT_CLOSED')
    if errors:
        print('OPENAPI_CONTRACT_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'OPENAPI_CONTRACT_RESULT: PASS operations={len(operation_ids)}'); return 0
if __name__=='__main__': raise SystemExit(main())
