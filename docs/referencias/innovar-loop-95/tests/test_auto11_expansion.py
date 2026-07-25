import json,subprocess,unittest,yaml
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Auto11ExpansionTests(unittest.TestCase):
 def test_migrations_0010_to_0012_and_triggers_exist(self):
  names={p.name for p in (ROOT/'01-db/migrations').glob('*.sql')}
  self.assertTrue({'0010_execution_evidence_ledger.sql','0011_event_transport_operational_triggers.sql','0012_runtime_configuration_audit.sql'}<=names)
  sql='\n'.join((ROOT/'01-db/migrations'/n).read_text() for n in names if n.startswith(('0010','0011','0012')))
  for token in ['CREATE TRIGGER','FORCE ROW LEVEL SECURITY','append-only','attempt_count cannot decrease']: self.assertIn(token,sql)
 def test_openapi_and_asyncapi_expose_evidence_contract(self):
  api=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text()); aa=yaml.safe_load((ROOT/'02-events/asyncapi.yaml').read_text())
  self.assertIn('/v1/admin/execution-evidence',api['paths']); self.assertIn('executionEvidenceRecorded',aa['channels'])
 def test_environment_schema_and_example_validate(self):
  cp=subprocess.run(['python3','scripts/validate_execution_env.py'],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(cp.returncode,0,cp.stdout+cp.stderr); self.assertIn('PASS',cp.stdout)
 def test_sdk_generation_is_deterministic(self):
  subprocess.check_call(['python3','scripts/generate_sdk_contract.py'],cwd=ROOT)
  p=ROOT/'06-sdk/generated/openapi-operation-inventory.json'; one=p.read_bytes(); subprocess.check_call(['python3','scripts/generate_sdk_contract.py'],cwd=ROOT); self.assertEqual(one,p.read_bytes())
 def test_kubernetes_evidence_workload_is_hardened(self):
  text=(ROOT/'05-infra/kubernetes/execution-evidence-job.yaml').read_text()
  for token in ['runAsNonRoot: true','allowPrivilegeEscalation: false','readOnlyRootFilesystem: true','drop: ["ALL"]','backoffLimit: 0']: self.assertIn(token,text)
 def test_distributed_gameday_is_fail_closed(self):
  text=(ROOT/'scripts/run_distributed_gameday.sh').read_text(); self.assertIn('exit 77',text); self.assertIn('rpk cluster health --exit-when-healthy',text); self.assertIn('rto_ms',text)
 def test_new_event_schema_is_closed(self):
  s=json.loads((ROOT/'02-events/schemas/platform/execution.evidence.recorded.v1.schema.json').read_text()); self.assertFalse(s['additionalProperties']); self.assertIn('status',s['required'])
if __name__=='__main__': unittest.main()
