import json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ExecutionEvidenceSteps(unittest.TestCase):
 def test_canonical_environment_validation_passes(self):
  cp=subprocess.run(['python3','scripts/validate_execution_env.py'],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(cp.returncode,0,cp.stdout+cp.stderr)
 def test_invalid_pool_configuration_fails_closed(self):
  src=(ROOT/'05-config/.env.execution-evidence.example').read_text().replace('DATABASE_POOL_MIN=2','DATABASE_POOL_MIN=30').replace('DATABASE_POOL_MAX=20','DATABASE_POOL_MAX=10')
  with tempfile.NamedTemporaryFile('w',delete=False) as f: f.write(src); name=f.name
  cp=subprocess.run(['python3','scripts/validate_execution_env.py',name],cwd=ROOT,text=True,capture_output=True)
  self.assertNotEqual(cp.returncode,0)
 def test_sdk_generation_is_byte_deterministic(self):
  subprocess.check_call(['python3','scripts/generate_sdk_contract.py'],cwd=ROOT)
  p=ROOT/'06-sdk/generated/openapi-operation-inventory.json'; first=p.read_bytes()
  subprocess.check_call(['python3','scripts/generate_sdk_contract.py'],cwd=ROOT)
  self.assertEqual(first,p.read_bytes())
 def test_postgres_gate_without_database_is_blocked(self):
  cp=subprocess.run(['python3','scripts/test_postgres_event_transport.py'],cwd=ROOT,text=True,capture_output=True,env={})
  self.assertEqual(cp.returncode,77,cp.stdout+cp.stderr)
if __name__=='__main__': unittest.main()
