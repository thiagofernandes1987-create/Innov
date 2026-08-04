from pathlib import Path
import subprocess,sys,unittest,yaml
ROOT=Path(__file__).resolve().parents[1]

class Auto10TraceabilityIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.matrix=yaml.safe_load((ROOT/'traceability/CAPABILITY-FACET-MATRIX.yaml').read_text())

    def test_all_facet_scores_use_zero_to_one_hundred_scale(self):
        for cap in self.matrix['capabilities'].values():
            for facet in cap['facets'].values():
                self.assertGreaterEqual(facet['score'],0)
                self.assertLessEqual(facet['score'],100)

    def test_declared_sci_matches_facet_mean(self):
        for cap in self.matrix['capabilities'].values():
            scores=[float(f['score']) for f in cap['facets'].values()]
            self.assertAlmostEqual(float(cap['sci_percent']),round(sum(scores)/len(scores),1),places=1)

    def test_every_incomplete_facet_has_explicit_gap(self):
        for cap_name,cap in self.matrix['capabilities'].items():
            for facet_name,facet in cap['facets'].items():
                if facet['score'] < 100:
                    self.assertTrue(facet.get('gap'),f'{cap_name}.{facet_name}')

    def test_traceability_gate_passes(self):
        p=subprocess.run([sys.executable,str(ROOT/'scripts/validate_traceability_matrix.py')],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)
        self.assertIn('TRACEABILITY_MATRIX_RESULT: PASS',p.stdout)

if __name__=='__main__': unittest.main()
