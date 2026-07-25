#!/usr/bin/env python3
from pathlib import Path
import re,sys,yaml,json
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]

def main():
    errors=[]
    manifest=yaml.safe_load((ROOT/'RELEASE-MANIFEST.yaml').read_text(encoding='utf-8'))
    schema=json.loads((ROOT/'schemas/release-manifest.schema.json').read_text(encoding='utf-8'))
    for e in Draft202012Validator(schema).iter_errors(manifest): errors.append(f'MANIFEST_SCHEMA:{e.json_path}:{e.message}')
    status=(ROOT/manifest['canonical_status']).read_text(encoding='utf-8')
    readme=(ROOT/'README.md').read_text(encoding='utf-8'); rid=manifest['release_id']
    if rid not in status: errors.append('STATUS_RELEASE_MISMATCH')
    if rid not in readme: errors.append('README_RELEASE_MISMATCH')
    for key in ['canonical_blueprint','canonical_status','canonical_requirements','canonical_finding_source','current_remediation_report','hash_manifest']:
        rel=manifest[key]
        if not (ROOT/rel).exists(): errors.append(f'MISSING_CANONICAL_PATH:{key}:{rel}')
    current=ROOT/manifest['current_validation']
    if not current.exists(): errors.append(f'MISSING_CURRENT_VALIDATION:{current.relative_to(ROOT)}')
    else:
        try:
            summary=json.loads(current.read_text(encoding='utf-8'))
            if summary.get('release_id')!=rid: errors.append('VALIDATION_RELEASE_MISMATCH')
            if summary.get('overall_status')=='FAIL': errors.append('CURRENT_VALIDATION_FAIL')
        except Exception as e: errors.append(f'CURRENT_VALIDATION_INVALID:{e}')
    if re.search(r'Status canônico\s*[—-]\s*AUTO6',status,re.I): errors.append('STALE_AUTO6_STATUS')
    if 'SCI global: **NOT_CALCULATED**' not in status: errors.append('SCI_STATUS_NOT_EXPLICIT')
    print(f'CANONICAL_RELEASE {rid}')
    if errors:
        print('CANONICAL_STATUS_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print('CANONICAL_STATUS_RESULT: PASS'); return 0
if __name__=='__main__': raise SystemExit(main())
