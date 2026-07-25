import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class EvidenceCampaignTests(unittest.TestCase):
 def test_event_transport_xstate_machine_exists(self):
  text=(ROOT/'03-statecharts/xstate/event-transport.machine.ts').read_text()
  for state in ['pending','leased','retryWaiting','published','deadLetter','resolved']: self.assertIn(state,text)
  self.assertIn('mayRetry',text)
 def test_sdk_drift_gate_is_fail_closed(self):
  text=(ROOT/'scripts/check_sdk_drift.sh').read_text(); self.assertIn('diff -ru',text); self.assertIn('exit 1',text)
 def test_ci_executes_xstate_and_sdk_drift_with_hardening(self):
  text=(ROOT/'.github/workflows/executable-spec-integration.yaml').read_text()
  self.assertIn('bash scripts/check_sdk_drift.sh',text)
  self.assertIn('python scripts/validate_dependency_locks.py',text)
  self.assertIn('--require-hashes -r requirements-ci.lock',text)
  self.assertIn('cd tools/xstate-runtime && npm ci --ignore-scripts --no-audit --no-fund && npm test',text)
  self.assertNotIn('npm install ',text)
  self.assertRegex(text,r'actions/checkout@[a-f0-9]{40}')
if __name__=='__main__': unittest.main()
