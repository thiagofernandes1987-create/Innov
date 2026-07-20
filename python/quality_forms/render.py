from __future__ import annotations

from html import escape
from typing import Any, Mapping

from .models import FieldType, FormDefinition, FormEvaluation


def _display(value: Any) -> str:
    if value is None or value == "":
        return "—"
    if isinstance(value, bool):
        return "Sim" if value else "Não"
    return escape(str(value))


def render_form_html(
    definition: FormDefinition,
    answers: Mapping[str, Any],
    *,
    evaluation: FormEvaluation | None = None,
    organization_name: str = "Innovar Construções e Reformas",
    project_name: str | None = None,
) -> str:
    sections: list[str] = []
    for field_definition in definition.fields:
        value = answers.get(field_definition.key)
        if field_definition.type is FieldType.CHECKLIST:
            checklist = value if isinstance(value, Mapping) else {}
            rows = "".join(
                "<tr><td>{}</td><td class='status'>{}</td></tr>".format(
                    escape(item.label),
                    escape(str(checklist.get(item.key, "—"))),
                )
                for item in field_definition.items
            )
            content = f"<table><thead><tr><th>Item verificado</th><th>Resultado</th></tr></thead><tbody>{rows}</tbody></table>"
        elif field_definition.type in {FieldType.FILE, FieldType.PHOTO}:
            content = f"<p class='file'>Arquivo/evidência: {_display(value)}</p>"
        else:
            content = f"<p class='answer'>{_display(value)}</p>"
        sections.append(
            "<section><h2>{}</h2>{}</section>".format(
                escape(field_definition.label), content
            )
        )

    result = evaluation.result if evaluation else None
    score = evaluation.score if evaluation else None
    nonconformities = evaluation.nonconformities if evaluation else ()
    summary = ""
    if evaluation:
        nc = "".join(f"<li>{escape(item)}</li>" for item in nonconformities)
        summary = (
            "<section class='summary'><h2>Resultado</h2>"
            f"<div class='result'>{escape(result or '—')}</div>"
            f"<div class='score'>{'—' if score is None else f'{score:.2f}'}</div>"
            f"{'<ul>'+nc+'</ul>' if nc else ''}</section>"
        )

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>{escape(definition.title or definition.code or definition.kind.value)}</title>
<style>
@page {{ size: A4; margin: 16mm; }}
body {{ font-family: Arial, sans-serif; color: #10212b; line-height: 1.4; }}
header {{ border-bottom: 3px solid #214488; padding-bottom: 12px; margin-bottom: 20px; }}
header strong {{ font-size: 22px; letter-spacing: .08em; }}
header p {{ margin: 4px 0; color: #56656e; }}
h1 {{ font-size: 24px; margin: 18px 0 4px; }}
section {{ break-inside: avoid; border: 1px solid #d8e0e5; border-radius: 8px; padding: 12px; margin: 10px 0; }}
h2 {{ font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #52636e; margin: 0 0 8px; }}
.answer {{ font-size: 15px; margin: 0; white-space: pre-wrap; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ border: 1px solid #d8e0e5; padding: 8px; text-align: left; }}
th {{ background: #f2f6f8; }}
.status {{ width: 25%; font-weight: bold; }}
.summary {{ display: grid; grid-template-columns: 1fr auto; gap: 8px 20px; border-color: #214488; }}
.result {{ font-size: 20px; font-weight: bold; }}
.score {{ font-size: 30px; font-weight: bold; color: #214488; }}
footer {{ margin-top: 24px; padding-top: 10px; border-top: 1px solid #d8e0e5; font-size: 10px; color: #697983; }}
</style>
</head>
<body>
<header>
<strong>{escape(organization_name.upper())}</strong>
<h1>{escape(definition.title or definition.kind.value)}</h1>
<p>Código: {escape(definition.code or '—')} · Motor: {definition.engine_version}</p>
<p>Obra: {escape(project_name or 'Geral')}</p>
</header>
{''.join(sections)}
{summary}
<footer>Documento gerado pelo motor Python de formulários da Innovar Platform. A versão oficial é vinculada ao registro e ao hash persistido na plataforma.</footer>
</body>
</html>"""
