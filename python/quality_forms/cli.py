from __future__ import annotations

import argparse
import json
from pathlib import Path

from .models import AnswerPayload, FormDefinition, evaluate_form
from .render import render_form_html


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida e renderiza formulários FVS/FVM da Innovar.")
    parser.add_argument("definition", type=Path, help="Arquivo JSON com o schema do formulário")
    parser.add_argument("answers", type=Path, help="Arquivo JSON com as respostas")
    parser.add_argument("--output", type=Path, required=True, help="Arquivo HTML de saída")
    parser.add_argument("--title", default="")
    parser.add_argument("--code", default="")
    parser.add_argument("--project", default=None)
    args = parser.parse_args()

    definition_raw = json.loads(args.definition.read_text(encoding="utf-8"))
    answers_raw = json.loads(args.answers.read_text(encoding="utf-8"))
    definition = FormDefinition.from_dict(definition_raw, title=args.title, code=args.code)
    evaluation = evaluate_form(definition, AnswerPayload(values=answers_raw))
    if not evaluation.valid:
        for error in evaluation.errors:
            print(error)
        return 2
    html = render_form_html(definition, answers_raw, evaluation=evaluation, project_name=args.project)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html, encoding="utf-8")
    print(json.dumps({"valid": True, "score": evaluation.score, "result": evaluation.result}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
