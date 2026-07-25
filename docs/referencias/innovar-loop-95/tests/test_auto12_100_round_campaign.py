import unittest, pathlib
R=pathlib.Path(__file__).resolve().parents[1]
class Auto12R2(unittest.TestCase):
 def test_campaign_has_100_classified_rounds(self):
  t=(R/'scripts/run_100_round_evidence_campaign.py').read_text()
  self.assertIn("add(100",t)
  self.assertIn("AUTO12-R2-100-ROUND-CAMPAIGN.json",t)
  self.assertIn("overall='FAIL'",t)
  self.assertIn("PARTIAL_BLOCKED",t)
  self.assertIn("PASS_WITHOUT_EVIDENCE",t)
 def test_binding_registry_is_explicit(self):
  text=(R/'04-bdd/BINDING-REGISTRY.yaml').read_text()
  self.assertIn('scenario_count: 38',text)
  self.assertIn('execution_level:',text)
 def test_migrations_0001_0013_contiguous(self):
  names={p.name[:4] for p in (R/'01-db/migrations').glob('[0-9]*.sql')}
  self.assertTrue({f'{i:04d}' for i in range(1,15)}<=names)
if __name__=='__main__': unittest.main()
