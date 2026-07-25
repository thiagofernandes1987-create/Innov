#!/usr/bin/env python3
import json,sys
from pathlib import Path
import jsonschema
R=Path(__file__).resolve().parents[1]; src=Path(sys.argv[1]) if len(sys.argv)>1 else R/'05-config/.env.execution-evidence.example'; vals={}
for line in src.read_text().splitlines():
 line=line.strip()
 if not line or line.startswith('#'): continue
 k,v=line.split('=',1);vals[k]=v
s=json.loads((R/'05-config/execution-evidence-env.schema.json').read_text())
for k,p in s['properties'].items():
 if k in vals and p.get('type')=='integer': vals[k]=int(vals[k])
 if k in vals and p.get('type')=='boolean': vals[k]=vals[k].lower()=='true'
jsonschema.Draft202012Validator(s).validate(vals)
assert vals['DATABASE_POOL_MAX']>=vals['DATABASE_POOL_MIN']; assert vals['OUTBOX_RETRY_MAX_MS']>=vals['OUTBOX_RETRY_BASE_MS']
print('ENV_VALIDATION: PASS')
