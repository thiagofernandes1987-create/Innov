#!/usr/bin/env python3
from pathlib import Path
import re,yaml
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=ROOT/'.github/workflows/executable-spec-integration.yaml'; text=p.read_text(); doc=yaml.safe_load(text); errors=[]
    registry=yaml.safe_load((ROOT/'supply-chain/ACTION-PINS.yaml').read_text())
    approved={(x['repository'],x['sha']) for x in registry['pins']}
    if doc.get('permissions')!={'contents':'read'}: errors.append('ROOT_PERMISSIONS_NOT_MINIMAL')
    if 'concurrency' not in doc: errors.append('CONCURRENCY_MISSING')
    if 'pull_request_target' in text: errors.append('PULL_REQUEST_TARGET_FORBIDDEN')
    for job,j in doc.get('jobs',{}).items():
        if 'timeout-minutes' not in j: errors.append(f'{job}:TIMEOUT_MISSING')
    for n,line in enumerate(text.splitlines(),1):
        m=re.search(r'uses:\s*([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)@([^\s#]+)',line)
        if not m: continue
        repo,ref=m.groups()
        if repo.startswith('docker://'): continue
        if not re.fullmatch(r'[a-f0-9]{40}',ref): errors.append(f'LINE_{n}:ACTION_NOT_SHA:{repo}@{ref}')
        elif (repo,ref) not in approved: errors.append(f'LINE_{n}:UNREGISTERED_PIN:{repo}@{ref}')
    if re.search(r'\bnpm\s+install\b',text): errors.append('NONDETERMINISTIC_NPM_INSTALL_FORBIDDEN')
    if text.count('npm ci') < 2: errors.append('NPM_CI_GATES_MISSING')
    if '--require-hashes -r requirements-ci.lock' not in text: errors.append('PYTHON_HASH_LOCK_INSTALL_MISSING')
    if text.count('python scripts/validate_dependency_locks.py') < 2: errors.append('DEPENDENCY_LOCK_GATES_MISSING')
    if 'python scripts/validate_image_references.py' not in text: errors.append('IMAGE_DIGEST_GATE_MISSING')
    if errors:
        print('WORKFLOW_SECURITY_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print(f'WORKFLOW_SECURITY_RESULT: PASS approved_pins={len(approved)}'); return 0
if __name__=='__main__': raise SystemExit(main())
