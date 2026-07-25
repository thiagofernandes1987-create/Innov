#!/usr/bin/env python3
from pathlib import Path
import hashlib,time,yaml
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ARTIFACT-METADATA.yaml'
EXCLUDED={'ARTIFACT-METADATA.yaml','MANIFEST.json','SHA256SUMS.txt'}
EXCLUDED_PREFIX=('audit/round2/','audit/r2-uta/','remediation/r2-uta/')
items=[]
for p in sorted(x for x in ROOT.rglob('*') if x.is_file()):
    rel=p.relative_to(ROOT).as_posix()
    if rel in EXCLUDED or rel.startswith(EXCLUDED_PREFIX): continue
    status='HISTORICAL' if rel.startswith('audit/') and '/round2/' not in rel else 'DRAFT'
    items.append({'artifact_id':f'ART-{len(items)+1:05d}','path':rel,'release_id':'INNOVAR-AUTO12-R2-UTA-R2','status':status,'effective_at':'2026-07-23','sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
OUT.write_text(yaml.safe_dump({'version':1,'generated_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'exclusions':{'exact':sorted(EXCLUDED),'prefixes':list(EXCLUDED_PREFIX),'reason':'self-referential integrity and volatile validation evidence are frozen by release manifests'},'items':items},sort_keys=False))
print(f'ARTIFACT_METADATA_GENERATION: PASS artifacts={len(items)}')
