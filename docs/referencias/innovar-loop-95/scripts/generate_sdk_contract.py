#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re,yaml
R=Path(__file__).resolve().parents[1]
API_PATH=R/'01-api/openapi.yaml'

def load_external(ref,base): return json.loads((base/ref).resolve().read_text())
def type_expr(schema,base,components):
    if '$ref' in schema:
        ref=schema['$ref']
        if ref.startswith('#/components/schemas/'): return ref.rsplit('/',1)[-1]
        return type_expr(load_external(ref,base), (base/ref).resolve().parent, components)
    if 'allOf' in schema: return ' & '.join(type_expr(x,base,components) for x in schema['allOf'])
    if 'oneOf' in schema: return ' | '.join(type_expr(x,base,components) for x in schema['oneOf'])
    if 'enum' in schema: return ' | '.join(json.dumps(x) for x in schema['enum'])
    t=schema.get('type')
    if isinstance(t,list): return ' | '.join(type_expr({**schema,'type':x},base,components) for x in t)
    if t=='string': return 'string'
    if t in ('integer','number'): return 'number'
    if t=='boolean': return 'boolean'
    if t=='null': return 'null'
    if t=='array': return f"Array<{type_expr(schema.get('items',{}),base,components)}>"
    if t=='object' or 'properties' in schema:
        props=schema.get('properties',{}); req=set(schema.get('required',[])); parts=[]
        for name,sub in props.items(): parts.append(f"{json.dumps(name)}{'?' if name not in req else ''}: {type_expr(sub,base,components)}")
        ap=schema.get('additionalProperties')
        if ap is True: parts.append('[key: string]: unknown')
        elif isinstance(ap,dict): parts.append(f"[key: string]: {type_expr(ap,base,components)}")
        return '{ '+ '; '.join(parts)+' }'
    return 'unknown'

def success_schema(op):
    for code in ('200','201','202','204'):
        r=op.get('responses',{}).get(code)
        if not r: continue
        schema=((r.get('content') or {}).get('application/json') or {}).get('schema')
        if schema: return code,schema
        return code,None
    return None,None

def ref_name(schema):
    if not schema: return 'void'
    ref=schema.get('$ref') if isinstance(schema,dict) else None
    return ref.rsplit('/',1)[-1] if ref and ref.startswith('#/components/schemas/') else None

def main():
    api=yaml.safe_load(API_PATH.read_text()); components=api['components']['schemas']; lines=['/* AUTO-GENERATED. DO NOT EDIT. */']
    lines.append(f"export const OPENAPI_SOURCE_SHA256 = '{hashlib.sha256(API_PATH.read_bytes()).hexdigest()}' as const;")
    for name,schema in components.items():
        expr=type_expr(schema,API_PATH.parent,components)
        lines.append(f'export type {name} = {expr};')
    generated=R/'06-sdk/typescript/src/generated-contract.ts'; generated.write_text('\n'.join(lines)+'\n')
    ops=[]
    for path,item in api.get('paths',{}).items():
        inherited=[x.get('$ref') or x.get('name') for x in item.get('parameters',[]) if isinstance(x,dict)]
        for method,op in item.items():
            if method not in {'get','post','put','patch','delete'} or not isinstance(op,dict): continue
            params=list(item.get('parameters',[]))+list(op.get('parameters',[])); required_headers=[]
            for prm in params:
                if '$ref' in prm and prm['$ref'].startswith('#/components/parameters/'):
                    prm=api['components']['parameters'][prm['$ref'].rsplit('/',1)[-1]]
                if prm.get('in')=='header' and prm.get('required'): required_headers.append(prm['name'])
            code,schema=success_schema(op); response_ref=ref_name(schema)
            ops.append({'method':method.upper(),'path':path,'operationId':op['operationId'],'success_status':code,'response_type':response_ref or ('void' if schema is None else type_expr(schema,API_PATH.parent,components)),'required_headers':sorted(required_headers)})
    out=R/'06-sdk/generated'; out.mkdir(exist_ok=True)
    payload={'source_sha256':hashlib.sha256(API_PATH.read_bytes()).hexdigest(),'generated_types':'06-sdk/typescript/src/generated-contract.ts','operations':sorted(ops,key=lambda x:x['operationId'])}
    (out/'openapi-operation-inventory.json').write_text(json.dumps(payload,indent=2)+'\n')
    old=out/'openapi-operations.json'
    if old.exists(): old.unlink()
    print('SDK_GENERATION: PASS types=%d operations=%d' % (len(components),len(ops)))
if __name__=='__main__': main()
