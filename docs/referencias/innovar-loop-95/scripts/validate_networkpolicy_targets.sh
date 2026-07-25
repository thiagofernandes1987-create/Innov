#!/usr/bin/env bash
set -euo pipefail
VALUES=${1:-05-infra/helm/values.yaml}
command -v kubectl >/dev/null || { echo 'NETWORKPOLICY_TARGETS: BLOCKED - kubectl missing'; exit 77; }
command -v python3 >/dev/null
python3 - "$VALUES" <<'PY'
import subprocess,sys,yaml
v=yaml.safe_load(open(sys.argv[1]))['networkPolicy']['dependencies']
for name in ('postgresql','redpanda'):
 d=v[name]; ns=d['namespace']; labels=d['labels']
 selector=','.join(f'{k}={val}' for k,val in labels.items())
 subprocess.run(['kubectl','get','namespace',ns],check=True,capture_output=True,text=True)
 r=subprocess.run(['kubectl','get','pods','-n',ns,'-l',selector,'-o','name'],check=True,capture_output=True,text=True)
 if not r.stdout.strip(): raise SystemExit(f'NETWORKPOLICY_TARGETS: FAIL - no {name} pod matches {ns}/{selector}')
 print(f'NETWORKPOLICY_TARGETS: MATCH {name} {ns}/{selector}')
print('NETWORKPOLICY_TARGETS: PASS')
PY
