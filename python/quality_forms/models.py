from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Mapping, Sequence


class FormKind(str, Enum):
    FVS = "FVS"
    FVM = "FVM"
    INTERNAL_FORM = "INTERNAL_FORM"
    CLIENT_FORM = "CLIENT_FORM"
    SURVEY = "SURVEY"


class FieldType(str, Enum):
    SHORT_TEXT = "SHORT_TEXT"
    LONG_TEXT = "LONG_TEXT"
    NUMBER = "NUMBER"
    DATE = "DATE"
    SELECT = "SELECT"
    RADIO = "RADIO"
    CHECKBOX = "CHECKBOX"
    YES_NO = "YES_NO"
    RATING = "RATING"
    CHECKLIST = "CHECKLIST"
    FILE = "FILE"
    PHOTO = "PHOTO"


@dataclass(frozen=True)
class ChecklistItem:
    key: str
    label: str


@dataclass(frozen=True)
class FieldDefinition:
    key: str
    type: FieldType
    label: str
    required: bool = False
    placeholder: str | None = None
    options: tuple[str, ...] = ()
    items: tuple[ChecklistItem, ...] = ()
    minimum: float | None = None
    maximum: float | None = None

    def __post_init__(self) -> None:
        if not self.key or not self.key[0].isalpha():
            raise ValueError(f"Invalid field key: {self.key!r}")
        if not self.label.strip():
            raise ValueError(f"Field {self.key!r} requires a label")
        if self.type is FieldType.CHECKLIST and not self.items:
            raise ValueError(f"Checklist {self.key!r} requires items")
        if self.type in {FieldType.SELECT, FieldType.RADIO} and not self.options:
            raise ValueError(f"Field {self.key!r} requires options")
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError(f"Invalid range for {self.key!r}")

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any]) -> "FieldDefinition":
        items = tuple(
            ChecklistItem(key=str(item["key"]), label=str(item["label"]))
            for item in raw.get("items", [])
        )
        return cls(
            key=str(raw["key"]),
            type=FieldType(str(raw["type"])),
            label=str(raw["label"]),
            required=bool(raw.get("required", False)),
            placeholder=str(raw["placeholder"]) if raw.get("placeholder") else None,
            options=tuple(str(value) for value in raw.get("options", [])),
            items=items,
            minimum=float(raw["min"]) if raw.get("min") is not None else None,
            maximum=float(raw["max"]) if raw.get("max") is not None else None,
        )

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "key": self.key,
            "type": self.type.value,
            "label": self.label,
            "required": self.required,
        }
        if self.placeholder:
            result["placeholder"] = self.placeholder
        if self.options:
            result["options"] = list(self.options)
        if self.items:
            result["items"] = [asdict(item) for item in self.items]
        if self.minimum is not None:
            result["min"] = self.minimum
        if self.maximum is not None:
            result["max"] = self.maximum
        return result


@dataclass(frozen=True)
class FormDefinition:
    kind: FormKind
    fields: tuple[FieldDefinition, ...]
    engine_version: int = 1
    title: str = ""
    code: str = ""

    def __post_init__(self) -> None:
        if self.engine_version < 1:
            raise ValueError("engine_version must be positive")
        if not self.fields:
            raise ValueError("A form requires at least one field")
        keys = [item.key for item in self.fields]
        if len(keys) != len(set(keys)):
            raise ValueError("Field keys must be unique")

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any], *, title: str = "", code: str = "") -> "FormDefinition":
        return cls(
            kind=FormKind(str(raw.get("kind", FormKind.INTERNAL_FORM.value))),
            engine_version=int(raw.get("engineVersion", 1)),
            fields=tuple(FieldDefinition.from_dict(item) for item in raw.get("fields", [])),
            title=title,
            code=code,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "engineVersion": self.engine_version,
            "kind": self.kind.value,
            "fields": [item.to_dict() for item in self.fields],
        }


@dataclass(frozen=True)
class AnswerPayload:
    values: Mapping[str, Any]
    respondent_name: str | None = None
    respondent_email: str | None = None


@dataclass(frozen=True)
class FormEvaluation:
    valid: bool
    errors: tuple[str, ...] = ()
    score: float | None = None
    result: str | None = None
    nonconformities: tuple[str, ...] = ()


def _empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def evaluate_form(definition: FormDefinition, payload: AnswerPayload) -> FormEvaluation:
    errors: list[str] = []
    nonconformities: list[str] = []
    conforming = 0
    applicable = 0
    ratings: list[float] = []

    for field_definition in definition.fields:
        value = payload.values.get(field_definition.key)
        if field_definition.required and _empty(value):
            errors.append(f"Preencha: {field_definition.label}.")
            continue

        if field_definition.type in {FieldType.NUMBER, FieldType.RATING} and not _empty(value):
            try:
                numeric = float(value)
            except (TypeError, ValueError):
                errors.append(f"{field_definition.label} deve ser numérico.")
            else:
                if field_definition.minimum is not None and numeric < field_definition.minimum:
                    errors.append(f"{field_definition.label} deve ser no mínimo {field_definition.minimum:g}.")
                if field_definition.maximum is not None and numeric > field_definition.maximum:
                    errors.append(f"{field_definition.label} deve ser no máximo {field_definition.maximum:g}.")
                if field_definition.type is FieldType.RATING:
                    ratings.append(numeric)

        if field_definition.type is FieldType.CHECKLIST:
            checklist = value if isinstance(value, Mapping) else {}
            for item in field_definition.items:
                status = str(checklist.get(item.key, ""))
                if field_definition.required and not status:
                    errors.append(f"Avalie: {item.label}.")
                if status and status != "NOT_APPLICABLE":
                    applicable += 1
                    if status == "CONFORMING":
                        conforming += 1
                    elif status == "NONCONFORMING":
                        nonconformities.append(item.label)

    score: float | None = None
    result: str | None = None
    if applicable:
        score = round((conforming / applicable) * 100, 2)
        result = "NONCONFORMING" if nonconformities else "CONFORMING"
    elif ratings:
        score = round(sum(ratings) / len(ratings), 2)
        result = "ANSWERED"

    return FormEvaluation(
        valid=not errors,
        errors=tuple(errors),
        score=score,
        result=result,
        nonconformities=tuple(nonconformities),
    )


def build_fvs_template() -> FormDefinition:
    return FormDefinition(
        kind=FormKind.FVS,
        code="FVS-PADRAO",
        title="Ficha de Verificação de Serviço",
        fields=(
            FieldDefinition("service", FieldType.SHORT_TEXT, "Serviço verificado", True),
            FieldDefinition("location", FieldType.SHORT_TEXT, "Local / pavimento", True),
            FieldDefinition("inspection_date", FieldType.DATE, "Data da inspeção", True),
            FieldDefinition("inspector", FieldType.SHORT_TEXT, "Responsável pela inspeção", True),
            FieldDefinition(
                "checklist",
                FieldType.CHECKLIST,
                "Itens de verificação",
                True,
                items=(
                    ChecklistItem("execution", "Execução conforme projeto e procedimento"),
                    ChecklistItem("dimensions", "Dimensões, níveis e alinhamentos conferidos"),
                    ChecklistItem("finish", "Acabamento e limpeza adequados"),
                    ChecklistItem("safety", "Condições de segurança atendidas"),
                ),
            ),
            FieldDefinition("notes", FieldType.LONG_TEXT, "Observações"),
            FieldDefinition("evidence", FieldType.PHOTO, "Evidência fotográfica"),
        ),
    )


def build_fvm_template() -> FormDefinition:
    return FormDefinition(
        kind=FormKind.FVM,
        code="FVM-PADRAO",
        title="Ficha de Verificação de Material",
        fields=(
            FieldDefinition("material", FieldType.SHORT_TEXT, "Material", True),
            FieldDefinition("supplier", FieldType.SHORT_TEXT, "Fornecedor", True),
            FieldDefinition("invoice", FieldType.SHORT_TEXT, "Nota fiscal"),
            FieldDefinition("batch", FieldType.SHORT_TEXT, "Lote"),
            FieldDefinition("quantity", FieldType.NUMBER, "Quantidade recebida", True, minimum=0),
            FieldDefinition("receipt_date", FieldType.DATE, "Data do recebimento", True),
            FieldDefinition(
                "checklist",
                FieldType.CHECKLIST,
                "Verificação de recebimento",
                True,
                items=(
                    ChecklistItem("specification", "Especificação compatível com pedido/projeto"),
                    ChecklistItem("integrity", "Embalagem e integridade preservadas"),
                    ChecklistItem("certificate", "Certificados e laudos conferidos"),
                    ChecklistItem("storage", "Armazenamento adequado definido"),
                ),
            ),
            FieldDefinition(
                "decision",
                FieldType.RADIO,
                "Decisão",
                True,
                options=("ACEITO", "ACEITO COM RESSALVA", "REJEITADO"),
            ),
            FieldDefinition("notes", FieldType.LONG_TEXT, "Observações"),
            FieldDefinition("evidence", FieldType.PHOTO, "Foto do material / lote"),
        ),
    )
