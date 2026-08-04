#!/usr/bin/env python3
from pathlib import Path
import json, re, sys, subprocess, hashlib
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
snapshot = {
  "generated_at": datetime.now(timezone.utc).isoformat(),
  "canonical_blueprint": "INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md",
  "canonical_source_count": 1 if (root/"INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md").exists() else 0,
}

files = [p for p in root.rglob("*") if p.is_file()]
snapshot["artifact_count"] = len(files)
snapshot["artifact_counts_by_area"] = {}
for area in ["00-decisions","01-api","01-db","02-commands","02-events","03-statecharts","04-bdd","05-config","05-infra","06-adapters","06-sdk","07-adrs","audit","tests","traceability","reference_runtime"]:
    snapshot["artifact_counts_by_area"][area] = len([p for p in (root/area).rglob("*") if p.is_file()]) if (root/area).exists() else 0

features = list((root/"04-bdd/features").glob("*.feature")) if (root/"04-bdd/features").exists() else []
snapshot["gherkin_feature_files"] = len(features)
snapshot["gherkin_scenarios_descriptive"] = sum(len(re.findall(r"^\s*Scenario(?: Outline)?:", p.read_text(), re.M)) for p in features)

test_files = list((root/"tests").glob("test_*.py")) if (root/"tests").exists() else []
snapshot["automated_test_files"] = len(test_files)

# Coverage text conflicts: only top canonical status may state "vigente".
bp=(root/"INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md").read_text()
vigentes = re.findall(r"cobertura (?:defensável )?vigente[^0-9]*([0-9]+(?:[.,][0-9]+)?)%", bp, re.I)
snapshot["current_coverage_values_found"] = vigentes
snapshot["conflicting_current_coverage_values"] = max(0, len(set(vigentes)) - 1)
snapshot["sci_status"] = "NOT_CALCULATED"
snapshot["portfolio_sci_status"] = "NOT_CALCULATED"
snapshot["portfolio_eei_status"] = "NOT_CALCULATED"
snapshot["historical_metrics"] = [{"indicator": "EEI_LEGACY", "value_percent": 59.3, "status": "SUPERSEDED_HISTORICAL"}]

# Hash canonical blueprint to make delivery traceable.
snapshot["canonical_blueprint_sha256"] = hashlib.sha256((root/"INNOVAR_PLATFORM_BLUEPRINT_EXECUTAVEL.md").read_bytes()).hexdigest()

out=root/"audit"/"METRICS-SNAPSHOT.json"
out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))
print(json.dumps(snapshot, indent=2, ensure_ascii=False))
