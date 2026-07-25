#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT=Path(__file__).resolve().parents[1]
SCHEMA=ROOT/'05-config/execution-evidence-env.schema.json'
EXAMPLE=ROOT/'05-config/.env.execution-evidence.example'

def parse_env(path: Path) -> tuple[dict[str,str], list[str]]:
    values={}; errors=[]
    for lineno,raw in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        line=raw.strip()
        if not line or line.startswith('#'): continue
        if '=' not in line:
            errors.append(f'line {lineno}: missing ='); continue
        key,value=line.split('=',1)
        key=key.strip(); value=value.strip()
        if not key: errors.append(f'line {lineno}: empty key'); continue
        if key in values: errors.append(f'line {lineno}: duplicate key {key}')
        values[key]=value
    return values,errors

def coerce(value: str, schema: dict):
    t=schema.get('type')
    if t=='integer': return int(value)
    if t=='number': return float(value)
    if t=='boolean':
        v=value.lower()
        if v not in {'true','false'}: raise ValueError('expected true or false')
        return v=='true'
    return value

def main() -> int:
    schema=json.loads(SCHEMA.read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    raw,errors=parse_env(EXAMPLE)
    props=schema.get('properties',{})
    unknown=sorted(set(raw)-set(props))
    if unknown: errors.append('unknown keys: '+', '.join(unknown))
    typed={}
    for key,value in raw.items():
        if key not in props: continue
        try: typed[key]=coerce(value,props[key])
        except Exception as exc: errors.append(f'{key}: {exc}')
    for error in Draft202012Validator(schema).iter_errors(typed):
        loc='.'.join(str(x) for x in error.path) or '$'
        errors.append(f'{loc}: {error.message}')
    if errors:
        print('ENV_CONTRACT_RESULT: FAIL')
        print('\n'.join(errors)); return 1
    print(f'ENV_KEYS_VALIDATED {len(typed)}')
    print('ENV_CONTRACT_RESULT: PASS')
    return 0
if __name__=='__main__': raise SystemExit(main())
