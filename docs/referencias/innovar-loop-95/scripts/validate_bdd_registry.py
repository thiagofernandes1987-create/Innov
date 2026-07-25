#!/usr/bin/env python3
from pathlib import Path
import re,yaml
ROOT=Path(__file__).resolve().parents[1]
def norm_steps(lines):
 return tuple(re.sub(r'\s+',' ',x.strip().lower()) for x in lines if re.match(r'^\s*(Given|When|Then|And|But|Dado|Quando|Então|E|Mas)\b',x,re.I))
def main():
 req=set(yaml.safe_load((ROOT/'00-decisions/requirements.yaml').read_text())['requirements'])
 reg=yaml.safe_load((ROOT/'04-bdd/BINDING-REGISTRY.yaml').read_text()); errors=[]; parsed=[]; bodies={}
 for p in sorted((ROOT/'04-bdd/features').glob('*.feature')):
  lines=p.read_text().splitlines(); tags=[]
  for i,line in enumerate(lines):
   if line.strip().startswith('@'): tags=re.findall(r'@(REQ-[A-Z0-9-]+|SCN-[A-Z0-9-]+)',line)
   m=re.match(r'^\s*Scenario(?: Outline)?:\s*(.+)$',line,re.I)
   if not m: continue
   scn=[x for x in tags if x.startswith('SCN-')]; reqs=[x for x in tags if x.startswith('REQ-')]
   if len(scn)!=1: errors.append(f'{p.name}:{i+1}:SCENARIO_ID_COUNT:{len(scn)}'); sid=f'INVALID-{p.name}-{i+1}'
   else: sid=scn[0]
   if not reqs: errors.append(f'{sid}:NO_REQUIREMENT')
   for rid in reqs:
    if rid not in req: errors.append(f'{sid}:UNKNOWN_REQUIREMENT:{rid}')
   end=next((j for j in range(i+1,len(lines)) if re.match(r'^\s*Scenario(?: Outline)?:',lines[j],re.I)),len(lines))
   body=norm_steps(lines[i+1:end]);
   if body in bodies: errors.append(f'DUPLICATE_STEPS:{sid}:{bodies[body]}')
   else: bodies[body]=sid
   parsed.append(sid); tags=[]
 items=reg.get('items',[]); ids=[x.get('scenario_id') for x in items]
 if len(ids)!=len(set(ids)): errors.append('REGISTRY_DUPLICATE_IDS')
 if set(ids)!=set(parsed): errors.append(f'REGISTRY_COVERAGE missing={sorted(set(parsed)-set(ids))} extra={sorted(set(ids)-set(parsed))}')
 for x in items:
  ep=x.get('evidence_path')
  if not ep or not (ROOT/ep).exists(): errors.append(f'{x.get("scenario_id")}:INVALID_EVIDENCE_PATH:{ep}')
  if x.get('status')=='PASS' and not x.get('binding'): errors.append(f'{x.get("scenario_id")}:PASS_WITHOUT_BINDING')
  if x.get('status')=='BLOCKED_EXTERNAL':
   if x.get('execution_level')!='NOT_EXECUTED': errors.append(f'{x.get("scenario_id")}:BLOCKED_LEVEL_MUST_BE_NOT_EXECUTED')
   if not x.get('required_execution_level'): errors.append(f'{x.get("scenario_id")}:BLOCKED_REQUIRED_LEVEL_MISSING')
 if errors:
  print('BDD_REGISTRY_RESULT: FAIL'); print('\n'.join(errors)); return 1
 print(f'BDD_REGISTRY_RESULT: PASS scenarios={len(parsed)} unique_step_bodies={len(bodies)}'); return 0
if __name__=='__main__': raise SystemExit(main())
