import unittest

from quality_forms.models import AnswerPayload, FormDefinition, build_fvm_template, build_fvs_template, evaluate_form
from quality_forms.render import render_form_html


class QualityFormTests(unittest.TestCase):
    def test_fvs_conforming(self):
        definition = build_fvs_template()
        evaluation = evaluate_form(
            definition,
            AnswerPayload(
                values={
                    "service": "Alvenaria",
                    "location": "Pavimento térreo",
                    "inspection_date": "2026-07-20",
                    "inspector": "Engenheiro",
                    "checklist": {
                        "execution": "CONFORMING",
                        "dimensions": "CONFORMING",
                        "finish": "CONFORMING",
                        "safety": "NOT_APPLICABLE",
                    },
                    "notes": "Sem observações",
                }
            ),
        )
        self.assertTrue(evaluation.valid)
        self.assertEqual(evaluation.result, "CONFORMING")
        self.assertEqual(evaluation.score, 100.0)

    def test_fvs_nonconforming(self):
        definition = build_fvs_template()
        evaluation = evaluate_form(
            definition,
            AnswerPayload(
                values={
                    "service": "Revestimento",
                    "location": "Fachada norte",
                    "inspection_date": "2026-07-20",
                    "inspector": "Qualidade",
                    "checklist": {
                        "execution": "CONFORMING",
                        "dimensions": "NONCONFORMING",
                        "finish": "CONFORMING",
                        "safety": "CONFORMING",
                    },
                }
            ),
        )
        self.assertTrue(evaluation.valid)
        self.assertEqual(evaluation.result, "NONCONFORMING")
        self.assertEqual(evaluation.score, 75.0)
        self.assertIn("Dimensões, níveis e alinhamentos conferidos", evaluation.nonconformities)

    def test_required_field_validation(self):
        definition = build_fvm_template()
        evaluation = evaluate_form(definition, AnswerPayload(values={}))
        self.assertFalse(evaluation.valid)
        self.assertGreater(len(evaluation.errors), 1)

    def test_schema_round_trip(self):
        original = build_fvm_template()
        restored = FormDefinition.from_dict(original.to_dict(), title=original.title, code=original.code)
        self.assertEqual(restored.to_dict(), original.to_dict())

    def test_html_rendering(self):
        definition = build_fvs_template()
        values = {
            "service": "Concreto armado",
            "location": "Bloco A",
            "inspection_date": "2026-07-20",
            "inspector": "Thiago",
            "checklist": {
                "execution": "CONFORMING",
                "dimensions": "CONFORMING",
                "finish": "CONFORMING",
                "safety": "CONFORMING",
            },
        }
        evaluation = evaluate_form(definition, AnswerPayload(values=values))
        html = render_form_html(definition, values, evaluation=evaluation, project_name="Residência Araucária")
        self.assertIn("Residência Araucária", html)
        self.assertIn("CONFORMING", html)
        self.assertIn("100.00", html)


if __name__ == "__main__":
    unittest.main()
