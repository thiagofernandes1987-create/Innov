from pathlib import Path
import unittest,yaml
ROOT=Path(__file__).resolve().parents[1]
class Auto9EvidenceIntegrityTests(unittest.TestCase):
 def test_validate_all_uses_explicit_bdd_registry_and_partial_blocked_status(self):
  text=(ROOT/'scripts/validate_all.py').read_text()
  self.assertIn('audit_gherkin_coverage.py',text)
  self.assertIn('validate_bdd_registry.py',text)
  self.assertIn("print('VALIDATION_RESULT: PARTIAL_BLOCKED')",text)
  self.assertNotIn('lexical hint',text)
 def test_all_state_machine_sources_are_registered(self):
  registry=yaml.safe_load((ROOT/'03-statecharts/STATE-MIGRATION-REGISTRY.yaml').read_text())
  self.assertEqual(len(registry['machines']),5)
  machine=registry['machines']['event-transport']
  self.assertEqual(machine['current_version'],1)
  self.assertEqual(machine['unknown_version_policy'],'stop_and_alert')
if __name__=='__main__': unittest.main()
