#!/usr/bin/env python3
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'RESOLVED_LOCAL','PARTIAL_EXTERNAL_DEPENDENCY','BLOCKED_EXTERNAL','DEFERRED_DECISION_REQUIRED'}
def main():
    source=yaml.safe_load((ROOT/'audit/round1-independent/FINDINGS_REGISTER.yaml').read_text())['findings']
    reg=yaml.safe_load((ROOT/'remediation/REMEDIATION-REGISTER.yaml').read_text())
    errors=[]; src_ids={x['id'] for x in source}; rows=reg.get('dispositions',[]); ids=[x.get('finding_id') for x in rows]
    if len(rows)!=35: errors.append(f'COUNT_EXPECTED_35_ACTUAL_{len(rows)}')
    if set(ids)!=src_ids: errors.append(f'ID_MISMATCH missing={sorted(src_ids-set(ids))} extra={sorted(set(ids)-src_ids)}')
    if len(ids)!=len(set(ids)): errors.append('DUPLICATE_FINDING_IDS')
    for x in rows:
        fid=x.get('finding_id'); status=x.get('status')
        if status not in ALLOWED: errors.append(f'{fid}:INVALID_STATUS:{status}')
        for rel in x.get('implementation_paths',[]):
            if not (ROOT/rel).exists(): errors.append(f'{fid}:MISSING_IMPLEMENTATION:{rel}')
        for rel in x.get('validation_evidence',[]):
            if not (ROOT/rel).exists(): errors.append(f'{fid}:MISSING_EVIDENCE:{rel}')
        if not x.get('validation_command'): errors.append(f'{fid}:MISSING_VALIDATION_COMMAND')
        if status!='RESOLVED_LOCAL' and not x.get('remaining_risk_or_dependency'): errors.append(f'{fid}:MISSING_REMAINING_RISK')
    actual={s:sum(x.get('status')==s for x in rows) for s in ALLOWED}
    if actual!=reg.get('status_counts'): errors.append(f'STATUS_COUNTS_MISMATCH declared={reg.get("status_counts")} actual={actual}')
    if errors:
        print('REMEDIATION_REGISTER_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print('REMEDIATION_REGISTER_RESULT: PASS '+ ' '.join(f'{k}={actual[k]}' for k in sorted(actual))); return 0
if __name__=='__main__': raise SystemExit(main())
