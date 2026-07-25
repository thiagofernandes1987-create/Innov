#!/usr/bin/env python3
from pathlib import Path
import json
import os
import re
import subprocess
import sys
import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]


def run(command, timeout=120):
    env = os.environ.copy()
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    env['TERM'] = 'xterm'
    try:
        process = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        return process.returncode, process.stdout + process.stderr
    except subprocess.TimeoutExpired as exc:
        return 124, (exc.stdout or '') + (exc.stderr or '') + '\nTIMEOUT'
    except FileNotFoundError as exc:
        return 127, str(exc)


def main():
    errors = []
    blocked = []
    evidence = []
    json_parse = schema_meta = yaml_parse = 0

    for path in ROOT.rglob('*.json'):
        try:
            document = json.loads(path.read_text(encoding='utf-8'))
            json_parse += 1
            if path.name.endswith('.schema.json'):
                Draft202012Validator.check_schema(document)
                schema_meta += 1
        except Exception as exc:
            errors.append(f'JSON_INVALID {path.relative_to(ROOT)}: {exc}')

    for path in ROOT.rglob('*.yaml'):
        if 'helm/templates' in path.as_posix():
            continue
        try:
            yaml.safe_load(path.read_text(encoding='utf-8'))
            yaml_parse += 1
        except Exception as exc:
            errors.append(f'YAML_INVALID {path.relative_to(ROOT)}: {exc}')

    for path in [ROOT / '01-api/openapi.yaml', ROOT / '02-events/asyncapi.yaml']:
        for ref in re.findall(r"\$ref:\s*['\"]?([^'\"\s}]+)", path.read_text(encoding='utf-8')):
            if ref.startswith('./') and not (path.parent / ref.split('#', 1)[0]).exists():
                errors.append(f'BROKEN_REF {path.relative_to(ROOT)} -> {ref}')

    evidence.extend(
        [
            f'JSON_PARSE_OK count={json_parse}',
            f'JSON_SCHEMA_META_VALID count={schema_meta}',
            f'YAML_PARSE_OK count={yaml_parse}',
        ]
    )

    # Execute the complete test suite before validators. Some validators inspect or
    # regenerate derived artifacts; running another test-discovery process after that
    # sequence was non-deterministic in constrained CI/sandbox environments. A single
    # aggregate pytest run covers tests/ and bdd_steps/ without double counting.
    rc, output = run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider'], 300)
    evidence.append(f'[AGGREGATE_TEST_SUITE]\n{output}')
    print(f'GATE AGGREGATE_TEST_SUITE: rc={rc}', flush=True)
    if rc:
        errors.append(f'AGGREGATE_TEST_SUITE_FAILED:{rc}')

    local_validators = [
        ('CANONICAL_STATUS', 'validate_canonical_status.py'),
        ('OPENAPI_CONTRACT', 'validate_openapi_contract.py'),
        ('PACKAGE_HYGIENE', 'validate_package_hygiene.py'),
        ('EVIDENCE_RECORDS', 'validate_evidence_records.py'),
        ('TENANT_CONVENTION', 'validate_tenant_convention.py'),
        ('ERROR_CATALOG', 'validate_error_catalog.py'),
        ('ASYNCAPI_OPERATIONS', 'validate_asyncapi_operations.py'),
        ('BDD_REGISTRY', 'validate_bdd_registry.py'),
        ('GHERKIN_INVENTORY', 'audit_gherkin_coverage.py'),
        ('STATECHART_REGISTRY', 'validate_statechart_registry.py'),
        ('METRICS_MATRIX', 'validate_metrics_matrix.py'),
        ('WORKFLOW_SECURITY', 'validate_workflow_security.py'),
        ('SDK_OPERATION_COVERAGE', 'validate_sdk_operation_coverage.py'),
        ('EVENT_COMPATIBILITY', 'check_event_compatibility.py'),
        ('TRACEABILITY_MATRIX', 'validate_traceability_matrix.py'),
        ('ENV_CONTRACT', 'validate_env_contract.py'),
        ('REQUIREMENT_TRACEABILITY', 'validate_requirement_traceability.py'),
        ('HELM_STATIC', 'validate_helm_static.py'),
        ('REMEDIATION_REGISTER', 'validate_remediation_register.py'),
        ('RELEASE_FILE_MANIFEST', 'validate_release_file_manifest.py'),
        ('SHA256_MANIFEST', 'verify_sha256_manifest.py'),
    ]
    for name, script in local_validators:
        rc, output = run([sys.executable, str(ROOT / 'scripts' / script)], 90)
        evidence.append(f'[{name}]\n{output}')
        print(f'GATE {name}: rc={rc}', flush=True)
        if rc:
            errors.append(f'{name}_FAILED:{rc}')


    # Static prerequisites are always evaluated. Runtime integration gates are only
    # launched when explicitly authorized; otherwise they are reported as blocked.
    # This avoids accidental connections to stale environment endpoints and keeps
    # the default validation bounded and reproducible.
    for name, script in [
        ('DEPENDENCY_LOCK', 'validate_dependency_locks.py'),
        ('IMAGE_DIGEST', 'validate_image_references.py'),
    ]:
        rc, output = run([sys.executable, str(ROOT / 'scripts' / script)], 60)
        evidence.append(f'[{name}]\n{output}')
        print(f'GATE {name}: rc={rc}', flush=True)
        if rc == 77:
            blocked.append(f'{name}_BLOCKED_EXTERNAL')
        elif rc:
            errors.append(f'{name}_FAILED:{rc}')

    external_runtime_enabled = os.getenv('RUN_EXTERNAL_INTEGRATION_GATES') == '1'
    runtime_gates = [
        ('POSTGRES_RUNTIME', [sys.executable, str(ROOT / 'scripts' / 'test_postgres_event_transport.py')]),
        ('REDPANDA_RUNTIME', [sys.executable, str(ROOT / 'scripts' / 'test_redpanda_runtime.py')]),
        ('XSTATE_OFFICIAL_RUNTIME', [sys.executable, str(ROOT / 'scripts' / 'test_xstate_official_runtime.py')]),
        ('NETWORKPOLICY_RUNTIME', ['bash', str(ROOT / 'scripts' / 'validate_networkpolicy_targets.sh')]),
    ]
    for name, command in runtime_gates:
        if not external_runtime_enabled:
            output = 'BLOCKED_EXTERNAL: set RUN_EXTERNAL_INTEGRATION_GATES=1 in an authorized environment'
            evidence.append(f'[{name}]\n{output}')
            print(f'GATE {name}: rc=77', flush=True)
            blocked.append(f'{name}_BLOCKED_EXTERNAL')
            continue
        rc, output = run(command, 120)
        evidence.append(f'[{name}]\n{output}')
        print(f'GATE {name}: rc={rc}', flush=True)
        if rc == 77:
            blocked.append(f'{name}_BLOCKED_EXTERNAL')
        elif rc:
            errors.append(f'{name}_FAILED:{rc}')

    print('\n'.join(evidence))
    if errors:
        print('VALIDATION_RESULT: FAIL')
        print('\n'.join(errors))
        return 1
    if blocked:
        print('VALIDATION_RESULT: PARTIAL_BLOCKED')
        print('\n'.join(blocked))
        return 77
    print('VALIDATION_RESULT: PASS')
    return 0


if __name__ == '__main__':
    exit_code = main()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(exit_code)
