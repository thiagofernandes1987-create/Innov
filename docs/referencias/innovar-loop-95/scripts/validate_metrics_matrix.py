#!/usr/bin/env python3
from pathlib import Path
import json,yaml
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]
def main():
 doc=yaml.safe_load((ROOT/'traceability/CAPABILITY-FACET-MATRIX.yaml').read_text()); schema=json.loads((ROOT/'schemas/capability-facet-matrix.schema.json').read_text()); errors=[]
 for e in Draft202012Validator(schema).iter_errors(doc): errors.append(f'SCHEMA:{e.json_path}:{e.message}')
 caps=doc.get('score_cap_policy',{})
 for name,cap in doc.get('capabilities',{}).items():
  facets=cap.get('facets',{}); scores=[]
  for facet_name,facet in facets.items():
   score=float(facet['score']); scores.append(score); level=facet['execution_level']; max_score=float(caps[level])
   if score>max_score: errors.append(f'EVIDENCE_CAP_EXCEEDED:{name}:{facet_name}:{score}>{max_score}:{level}')
   ev=facet['evidence']; ev=[ev] if isinstance(ev,str) else ev
   for path in ev:
    if not (ROOT/path).exists(): errors.append(f'MISSING_EVIDENCE:{name}:{facet_name}:{path}')
   if score==100 and (level!='OPERATIONALLY_PROVEN' or facet.get('gap')): errors.append(f'INVALID_100:{name}:{facet_name}')
  if len(facets)!=18: errors.append(f'FACET_COUNT:{name}:{len(facets)}')
  calc=round(sum(scores)/len(scores),1) if scores else 0
  if abs(calc-float(cap.get('sci_percent',-1)))>0.05: errors.append(f'SCI_MISMATCH:{name}:{calc}!={cap.get("sci_percent")}')
 if doc.get('portfolio_sci',{}).get('status')!='NOT_CALCULATED': errors.append('PORTFOLIO_SCI_MUST_REMAIN_NOT_CALCULATED')
 if errors: print('METRICS_MATRIX_RESULT: FAIL'); print('\n'.join(errors)); return 1
 print('METRICS_MATRIX_RESULT: PASS evidence_caps_enforced=true'); return 0
if __name__=='__main__': raise SystemExit(main())
