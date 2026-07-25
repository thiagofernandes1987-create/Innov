#!/usr/bin/env python3
from pathlib import Path
import sys,yaml
ROOT=Path(__file__).resolve().parents[1]
MATRIX=ROOT/'traceability/CAPABILITY-FACET-MATRIX.yaml'

def paths(value):
    if isinstance(value,str): return [value]
    if isinstance(value,list): return [x for x in value if isinstance(x,str)]
    return []

def main():
    doc=yaml.safe_load(MATRIX.read_text(encoding='utf-8'))
    errors=[]; checked=0
    caps=doc.get('capabilities',{})
    if not caps: errors.append('NO_CAPABILITIES')
    for cap_name,cap in caps.items():
        facets=cap.get('facets',{})
        if not facets:
            errors.append(f'{cap_name}:NO_FACETS'); continue
        scores=[]
        for facet_name,facet in facets.items():
            checked+=1
            score=facet.get('score')
            if not isinstance(score,(int,float)) or not 0 <= score <= 100:
                errors.append(f'{cap_name}.{facet_name}:INVALID_SCORE:{score}')
                continue
            scores.append(float(score))
            ev=paths(facet.get('evidence'))
            if not ev:
                errors.append(f'{cap_name}.{facet_name}:NO_EVIDENCE')
            for rel in ev:
                if rel.startswith(('http://','https://')): continue
                if not (ROOT/rel).exists():
                    errors.append(f'{cap_name}.{facet_name}:MISSING_EVIDENCE:{rel}')
            if score < 100 and not facet.get('gap'):
                errors.append(f'{cap_name}.{facet_name}:MISSING_EXPLICIT_GAP')
        declared=cap.get('sci_percent')
        if scores and isinstance(declared,(int,float)):
            actual=round(sum(scores)/len(scores),1)
            if abs(actual-float(declared))>0.1:
                errors.append(f'{cap_name}:SCI_MISMATCH:declared={declared}:actual={actual}')
        else:
            errors.append(f'{cap_name}:SCI_NOT_DECLARED')
    print(f'TRACEABILITY_FACETS_CHECKED {checked}')
    if errors:
        print('TRACEABILITY_MATRIX_RESULT: FAIL')
        print('\n'.join(errors))
        return 1
    print('TRACEABILITY_MATRIX_RESULT: PASS')
    return 0
if __name__=='__main__': raise SystemExit(main())
