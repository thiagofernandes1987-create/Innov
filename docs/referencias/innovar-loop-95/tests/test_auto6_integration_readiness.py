from pathlib import Path
import unittest, yaml
ROOT=Path(__file__).resolve().parents[1]
class Auto6IntegrationReadiness(unittest.TestCase):
 def test_postgres_gate_is_import_safe_fail_closed_and_deep(self):
  s=(ROOT/'scripts/test_postgres_event_transport.py').read_text()
  for token in ['return 77','gen_random_uuid()','NOBYPASSRLS','FOR UPDATE SKIP LOCKED','PostgresAdminStore',"'[0-9][0-9][0-9][0-9]_*.sql'",'if __name__']:
   self.assertIn(token,s)
  self.assertNotIn("sys.exit(77)",s)
 def test_networkpolicy_dependencies_are_configurable(self):
  values=yaml.safe_load((ROOT/'05-infra/helm/values.yaml').read_text())
  deps=values['networkPolicy']['dependencies']
  self.assertEqual(deps['postgresql']['namespace'],'innovar-data')
  self.assertEqual(deps['redpanda']['namespace'],'innovar-events')
  tpl=(ROOT/'05-infra/helm/templates/networkpolicy.yaml').read_text()
  self.assertIn('kubernetes.io/metadata.name',tpl)
  self.assertIn('.Values.networkPolicy.dependencies.redpanda.labels',tpl)
 def test_ci_has_postgres_helm_and_kubeconform_gates(self):
  s=(ROOT/'.github/workflows/executable-spec-integration.yaml').read_text()
  for token in ['postgres:16.4','test_postgres_event_transport.py','helm template','kubeconform:v0.7.0','-strict','permissions:','timeout-minutes:']:
   self.assertIn(token,s)
 def test_external_preflight_does_not_convert_blocked_to_pass(self):
  s=(ROOT/'scripts/validate_runtime_prerequisites.py').read_text()
  self.assertIn('sys.exit(0 if result["status"] == "PASS" else 77)',s)
 def test_integration_runbook_defines_evidence_chain(self):
  s=(ROOT/'09-runbooks/integration-evidence-gate.md').read_text()
  for token in ['PASS, FAIL e BLOCKED','SHA-256','kubectl --dry-run=server','RTO e P95']:
   self.assertIn(token,s)
if __name__=='__main__': unittest.main()
