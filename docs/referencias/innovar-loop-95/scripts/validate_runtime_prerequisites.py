#!/usr/bin/env python3
"""Fail-closed preflight for external integration evidence.
Exit 0 only when required tools/configuration are present; exit 77 means evidence blocked.
"""
import json, os, shutil, subprocess, sys
required = ["docker", "helm", "kubeconform", "kubectl"]
result = {"tools": {}, "environment": {}, "status": "PASS"}
for tool in required:
    path = shutil.which(tool)
    result["tools"][tool] = {"available": bool(path), "path": path}
for name in ["TEST_DATABASE_URL", "KUBECONFIG"]:
    result["environment"][name] = bool(os.getenv(name))
missing = [k for k,v in result["tools"].items() if not v["available"]]
if missing or not result["environment"]["TEST_DATABASE_URL"]:
    result["status"] = "BLOCKED"
    result["missing"] = missing + ([] if result["environment"]["TEST_DATABASE_URL"] else ["TEST_DATABASE_URL"])
print(json.dumps(result, indent=2, sort_keys=True))
sys.exit(0 if result["status"] == "PASS" else 77)
