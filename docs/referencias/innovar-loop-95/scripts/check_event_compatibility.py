#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]

def resolve(schema,doc_path,seen=None):
    seen=set() if seen is None else seen
    if not isinstance(schema,dict): return schema
    if '$ref' in schema:
        ref=schema['$ref']
        if ref.startswith('#'): return schema
        target=(doc_path.parent/ref).resolve(); key=str(target)
        if key in seen: raise ValueError(f'CIRCULAR_REF:{target}')
        return resolve(json.loads(target.read_text()),target,seen|{key})
    if 'allOf' in schema:
        merged={'type':'object','properties':{},'required':[]}
        additional=True
        for part in schema['allOf']:
            part=resolve(part,doc_path,seen)
            if not isinstance(part,dict): continue
            merged['properties'].update(part.get('properties',{})); merged['required']=sorted(set(merged['required'])|set(part.get('required',[])))
            if part.get('additionalProperties') is False: additional=False
            for k,v in part.items():
                if k not in {'properties','required','allOf','additionalProperties'}: merged[k]=v
        merged['additionalProperties']=additional
        return merged
    return schema

def type_set(schema):
    t=schema.get('type') if isinstance(schema,dict) else None
    if t is None: return set()
    return set(t if isinstance(t,list) else [t])

def compare(old,new,path,old_doc,new_doc,errors):
    old=resolve(old,old_doc); new=resolve(new,new_doc)
    if not isinstance(old,dict) or not isinstance(new,dict): return
    ot,nt=type_set(old),type_set(new)
    if ot and nt and not ot.issubset(nt): errors.append(f'TYPE_NARROWED {path}: {sorted(ot)} -> {sorted(nt)}')
    if 'enum' in old and not set(old['enum']).issubset(set(new.get('enum',[]))): errors.append(f'ENUM_NARROWED {path}')
    old_req,new_req=set(old.get('required',[])),set(new.get('required',[]))
    for k in sorted(new_req-old_req): errors.append(f'NEW_REQUIRED_PROPERTY {path}/{k}')
    old_props,new_props=old.get('properties',{}),new.get('properties',{})
    for k,v in old_props.items():
        if k not in new_props: errors.append(f'REMOVED_PROPERTY {path}/{k}')
        else: compare(v,new_props[k],f'{path}/{k}',old_doc,new_doc,errors)
    old_ap,new_ap=old.get('additionalProperties',True),new.get('additionalProperties',True)
    if old_ap is not False and new_ap is False: errors.append(f'ADDITIONAL_PROPERTIES_CLOSED {path}')
    if isinstance(old_ap,dict) and isinstance(new_ap,dict): compare(old_ap,new_ap,f'{path}/*',old_doc,new_doc,errors)
    bounds=[('minimum',lambda a,b:b>a),('exclusiveMinimum',lambda a,b:b>a),('minLength',lambda a,b:b>a),('minItems',lambda a,b:b>a),('maximum',lambda a,b:b<a),('exclusiveMaximum',lambda a,b:b<a),('maxLength',lambda a,b:b<a),('maxItems',lambda a,b:b<a)]
    for key,is_breaking in bounds:
        if key in new and key in old and is_breaking(old[key],new[key]): errors.append(f'CONSTRAINT_NARROWED {path}:{key}:{old[key]}->{new[key]}')
        elif key in new and key not in old: errors.append(f'NEW_CONSTRAINT {path}:{key}={new[key]}')
    if 'pattern' in new and old.get('pattern')!=new.get('pattern'): errors.append(f'PATTERN_CHANGED {path}')
    if 'items' in old and 'items' in new: compare(old['items'],new['items'],f'{path}[]',old_doc,new_doc,errors)

def check_directories(base,cur):
    errors=[]
    for old_path in sorted(base.rglob('*.schema.json')):
        new_path=cur/old_path.relative_to(base)
        if not new_path.exists(): errors.append(f'REMOVED_SCHEMA {old_path.relative_to(base)}'); continue
        old,new=json.loads(old_path.read_text()),json.loads(new_path.read_text())
        compare(old,new,f'/{old_path.relative_to(base).as_posix()}',old_path,new_path,errors)
    return errors

def main():
    errors=check_directories(ROOT/'02-events/compatibility-baseline',ROOT/'02-events/schemas')
    print('EVENT_COMPATIBILITY: PASS' if not errors else 'EVENT_COMPATIBILITY: FAIL')
    print('\n'.join(errors)); return 1 if errors else 0
if __name__=='__main__': raise SystemExit(main())
