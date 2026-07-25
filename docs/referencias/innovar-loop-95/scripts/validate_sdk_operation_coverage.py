#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re,subprocess,sys,yaml
ROOT=Path(__file__).resolve().parents[1]
def main():
    subprocess.run([sys.executable,str(ROOT/'scripts/generate_sdk_contract.py')],check=True,capture_output=True,text=True)
    api=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text()); inv=json.loads((ROOT/'06-sdk/generated/openapi-operation-inventory.json').read_text())
    errors=[]
    if inv['source_sha256']!=hashlib.sha256((ROOT/'01-api/openapi.yaml').read_bytes()).hexdigest(): errors.append('GENERATED_SOURCE_HASH_MISMATCH')
    ops={x['operationId']:x for x in inv['operations']}; bindings={x['operation_id']:x for x in yaml.safe_load((ROOT/'06-sdk/sdk-operation-bindings.yaml').read_text())['bindings']}
    if set(ops)!=set(bindings): errors.append(f'BINDING_COVERAGE missing={sorted(set(ops)-set(bindings))} extra={sorted(set(bindings)-set(ops))}')
    src=(ROOT/'06-sdk/typescript/src/index.ts').read_text()
    for oid,op in ops.items():
        b=bindings.get(oid)
        if not b: continue
        if b['response_type']!=op['response_type']: errors.append(f'RESPONSE_TYPE_DRIFT {oid}: binding={b["response_type"]} openapi={op["response_type"]}')
        declaration=re.search(rf'^\s{{2}}{re.escape(b["sdk_method"])}\([^\n]*\):Promise<([^>]+(?:>[^>]*)?)>;',src,re.M)
        if not declaration: errors.append(f'METHOD_DECLARATION_MISSING {oid}')
        elif b['response_type'] not in declaration.group(1): errors.append(f'METHOD_RETURN_TYPE_DRIFT {oid}:{declaration.group(1)}')
        openapi_requires='X-Idempotency-Key' in op['required_headers']
        if bool(b['requires_idempotency_key'])!=openapi_requires: errors.append(f'IDEMPOTENCY_BINDING_DRIFT {oid}')
        if openapi_requires:
            line=next((x for x in src.splitlines() if re.match(rf'^\s{{2}}{re.escape(b["sdk_method"])}\(',x)), '')
            if 'idempotencyKey:UUID' not in line.replace(' ',''): errors.append(f'IDEMPOTENCY_OPTION_NOT_REQUIRED {oid}')
    if errors:
        print('SDK_SEMANTIC_CONTRACT_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'SDK_SEMANTIC_CONTRACT_RESULT: PASS operations={len(ops)} source_hash={inv["source_sha256"]}'); return 0
if __name__=='__main__': raise SystemExit(main())
