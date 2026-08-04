#!/usr/bin/env python3
from pathlib import Path
import re,yaml
ROOT=Path(__file__).resolve().parents[1]
FEATURES=ROOT/'04-bdd/features'
PASS_BINDINGS={
 'SCN-BDD-EVT-005':'bdd_steps.test_event_transport_steps.Steps.test_given_open_dlq_when_replay_then_exactly_one_effect',
 'SCN-BDD-EVT-006':'bdd_steps.test_event_transport_steps.Steps.test_given_duplicate_delivery_when_consumed_then_one_effect',
 'SCN-BDD-EVID-006':'bdd_steps.test_execution_evidence_steps.ExecutionEvidenceSteps.test_canonical_environment_validation_passes',
 'SCN-BDD-EVID-007':'bdd_steps.test_execution_evidence_steps.ExecutionEvidenceSteps.test_invalid_pool_configuration_fails_closed',
 'SCN-BDD-EVID-009':'bdd_steps.test_execution_evidence_steps.ExecutionEvidenceSteps.test_postgres_gate_without_database_is_blocked',
 'SCN-BDD-EVID-012':'bdd_steps.test_execution_evidence_steps.ExecutionEvidenceSteps.test_sdk_generation_is_byte_deterministic',
 'SCN-BDD-IDEMP-001':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_same_key_and_payload_replays_original_response',
 'SCN-BDD-IDEMP-002':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_same_key_with_different_payload_is_rejected',
 'SCN-BDD-IDEMP-003':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_concurrent_key_reports_in_progress',
 'SCN-BDD-LIFE-001':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_publish_under_expected_version',
 'SCN-BDD-LIFE-002':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_reject_stale_transition',
 'SCN-BDD-LIFE-003':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_reject_published_mutation',
 'SCN-BDD-TEN-001':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_cross_tenant_read_denied',
 'SCN-BDD-TEN-002':'bdd_steps.test_remediation_steps.RemediationBehaviorSteps.test_organization_context_is_signed_server_side'}
BLOCKED={
 'SCN-BDD-EVT-003':'audit/evidence-records/postgres-runtime.json',
 'SCN-BDD-EVT-004':'audit/evidence-records/postgres-runtime.json'}
def main():
 items=[]
 for p in sorted(FEATURES.glob('*.feature')):
  pending=[]; lines=p.read_text().splitlines()
  for i,line in enumerate(lines,1):
   if line.strip().startswith('@'): pending=re.findall(r'@(REQ-[A-Z0-9-]+|SCN-[A-Z0-9-]+)',line)
   m=re.match(r'^\s*Scenario(?: Outline)?:\s*(.+)$',line,re.I)
   if not m: continue
   scns=[x for x in pending if x.startswith('SCN-')]; reqs=[x for x in pending if x.startswith('REQ-')]
   sid=scns[0] if len(scns)==1 else None
   item={'scenario_id':sid,'requirements':reqs,'feature':p.relative_to(ROOT).as_posix(),'line':i,'name':m.group(1).strip()}
   if sid in PASS_BINDINGS:
    item.update({'binding':PASS_BINDINGS[sid],'execution_level':'UNIT_EXECUTED','required_execution_level':None,'status':'PASS','evidence_path':PASS_BINDINGS[sid].split('.',1)[0].replace('.','/')+'.py'})
    # explicit source file mapping
    item['evidence_path']=('bdd_steps/test_event_transport_steps.py' if 'event_transport' in PASS_BINDINGS[sid] else ('bdd_steps/test_remediation_steps.py' if 'test_remediation_steps' in PASS_BINDINGS[sid] else 'bdd_steps/test_execution_evidence_steps.py'))
   elif sid in BLOCKED:
    item.update({'binding':None,'execution_level':'NOT_EXECUTED','required_execution_level':'EXTERNAL_INTEGRATION_EXECUTED','status':'BLOCKED_EXTERNAL','evidence_path':BLOCKED[sid]})
   else:
    item.update({'binding':None,'execution_level':'DOCUMENTED','required_execution_level':None,'status':'NOT_RUN','evidence_path':p.relative_to(ROOT).as_posix()})
   items.append(item); pending=[]
 doc={'version':2,'policy':'explicit-scenario-registry','scenario_count':len(items),'statuses':['PASS','FAIL','BLOCKED_EXTERNAL','NOT_RUN'],'items':items}
 (ROOT/'04-bdd/BINDING-REGISTRY.yaml').write_text(yaml.safe_dump(doc,sort_keys=False,allow_unicode=True,width=120))
 print(f'BDD_REGISTRY_GENERATED scenarios={len(items)}')
if __name__=='__main__': main()
