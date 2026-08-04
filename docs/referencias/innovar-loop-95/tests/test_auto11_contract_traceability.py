from pathlib import Path
import json,subprocess,sys,unittest,yaml
ROOT=Path(__file__).resolve().parents[1]
class Auto11ContractTraceabilityTests(unittest.TestCase):
    def test_environment_example_validates_against_schema(self):
        p=subprocess.run([sys.executable,str(ROOT/'scripts/validate_env_contract.py')],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)
        self.assertIn('ENV_CONTRACT_RESULT: PASS',p.stdout)
    def test_all_canonical_requirements_are_mapped(self):
        req=yaml.safe_load((ROOT/'00-decisions/requirements.yaml').read_text())['requirements']
        mp=yaml.safe_load((ROOT/'traceability/REQUIREMENT-EVIDENCE-MAP.yaml').read_text())['requirements']
        self.assertEqual(set(req),set(mp))
    def test_requirement_evidence_gate_passes(self):
        p=subprocess.run([sys.executable,str(ROOT/'scripts/validate_requirement_traceability.py')],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)
        self.assertIn('REQUIREMENT_TRACEABILITY_RESULT: PASS',p.stdout)
    def test_non_proven_requirements_keep_explicit_gaps(self):
        mp=yaml.safe_load((ROOT/'traceability/REQUIREMENT-EVIDENCE-MAP.yaml').read_text())['requirements']
        for rid,item in mp.items():
            if item['status']!='PROVEN': self.assertTrue(item.get('gap'),rid)
    def test_validate_all_invokes_new_gates(self):
        text=(ROOT/'scripts/validate_all.py').read_text()
        self.assertIn('validate_env_contract.py',text)
        self.assertIn('validate_requirement_traceability.py',text)
if __name__=='__main__': unittest.main()
