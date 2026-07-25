#!/usr/bin/env python3
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]

def main():
    doc=yaml.safe_load((ROOT/'02-events/asyncapi.yaml').read_text(encoding='utf-8')); errors=[]
    channels=doc.get('channels',{}); covered={k:set() for k in channels}
    if doc.get('asyncapi')!='3.0.0': errors.append('VERSION_NOT_3_0_0')
    if not doc.get('servers'): errors.append('SERVERS_MISSING')
    for ch,c in channels.items():
        if not c.get('address'): errors.append(f'{ch}:ADDRESS_MISSING')
        if not c.get('messages'): errors.append(f'{ch}:MESSAGES_MISSING')
        bindings=c.get('bindings',{})
        if 'kafka' not in bindings: errors.append(f'{ch}:KAFKA_BINDING_MISSING')
    for oid,op in doc.get('operations',{}).items():
        ref=op.get('channel',{}).get('$ref',''); ch=ref.rsplit('/',1)[-1] if ref else None
        if ch not in covered: errors.append(f'{oid}:UNKNOWN_CHANNEL:{ch}'); continue
        action=op.get('action')
        if action not in {'send','receive'}: errors.append(f'{oid}:INVALID_ACTION')
        covered[ch].add(action)
        if not op.get('messages'): errors.append(f'{oid}:MESSAGES_MISSING')
    for ch,actions in covered.items():
        if actions!={'send','receive'}: errors.append(f'{ch}:INCOMPLETE_ACTIONS:{sorted(actions)}')
    if errors:
        print('ASYNCAPI_OPERATIONS_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'ASYNCAPI_OPERATIONS_RESULT: PASS channels={len(covered)} operations={len(doc.get("operations",{}))}'); return 0
if __name__=='__main__': raise SystemExit(main())
