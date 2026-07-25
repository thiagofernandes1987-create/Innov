from __future__ import annotations
import json,pathlib,re,yaml
root=pathlib.Path(__file__).resolve().parents[1]; items=[]
for f in sorted((root/'04-bdd/features').glob('*.feature')):
 tags=[]
 for n,line in enumerate(f.read_text().splitlines(),1):
  if line.strip().startswith('@'): tags=re.findall(r'@(REQ-[A-Z0-9-]+|SCN-[A-Z0-9-]+)',line)
  m=re.match(r'^\s*Scenario(?: Outline)?:\s*(.+)$',line,re.I)
  if m:
   items.append({'feature':f.relative_to(root).as_posix(),'line':n,'name':m.group(1).strip(),'scenario_ids':[x for x in tags if x.startswith('SCN-')],'requirements':[x for x in tags if x.startswith('REQ-')]}); tags=[]
reg=yaml.safe_load((root/'04-bdd/BINDING-REGISTRY.yaml').read_text()); by={x['scenario_id']:x for x in reg['items']}
for x in items:
 sid=x['scenario_ids'][0] if len(x['scenario_ids'])==1 else None; r=by.get(sid,{}); x.update({'status':r.get('status','UNREGISTERED'),'execution_level':r.get('execution_level'),'binding':r.get('binding'),'evidence_path':r.get('evidence_path')})
summary={'features':len({x['feature'] for x in items}),'scenarios':len(items),'unique_scenario_ids':len({x['scenario_ids'][0] for x in items if len(x['scenario_ids'])==1}),'registered':sum(x['status']!='UNREGISTERED' for x in items),'executed_pass':sum(x['status']=='PASS' for x in items),'blocked_external':sum(x['status']=='BLOCKED_EXTERNAL' for x in items),'not_run':sum(x['status']=='NOT_RUN' for x in items),'method':'explicit scenario registry; no lexical hints','items':items}
out=root/'audit/round2/BDD-COVERAGE.json'; out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n'); print(json.dumps({k:v for k,v in summary.items() if k!='items'},ensure_ascii=False))
