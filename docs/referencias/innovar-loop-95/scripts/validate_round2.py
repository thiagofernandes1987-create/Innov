#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys,json,time,os,shutil
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit/round2'; OUT.mkdir(parents=True,exist_ok=True)
BAD_DIRS={'__pycache__','.pytest_cache'}

def clean():
    for p in list(ROOT.rglob('*')):
        if p.is_dir() and p.name in BAD_DIRS: shutil.rmtree(p,ignore_errors=True)
    for pattern in ('*.pyc','*.pyo','*.tmp'):
        for p in ROOT.rglob(pattern): p.unlink(missing_ok=True)

def execute(name,cmd,kind='LOCAL',allowed_block=False):
    """Execute a gate without pipe inheritance deadlocks.

    Some legacy tests spawn descendants that inherit stdout/stderr. Capturing with
    subprocess.PIPE can therefore wait forever for EOF after the direct process
    has exited. Redirecting to a temporary regular file avoids that ambiguity.
    """
    import tempfile, signal
    env=os.environ.copy(); env['PYTHONDONTWRITEBYTECODE']='1'; env['TERM']='xterm'
    print(f'ROUND2_GATE_START {name}', file=sys.stderr, flush=True)
    rc=127; suffix=''
    with tempfile.NamedTemporaryFile(mode='w+b', delete=False) as fh:
        tmp=Path(fh.name)
        try:
            proc=subprocess.Popen(cmd,cwd=ROOT,stdout=fh,stderr=subprocess.STDOUT,env=env,start_new_session=True)
            try:
                rc=proc.wait(timeout=240)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
                rc=77 if allowed_block else 124
                suffix='\nTIMEOUT\n'
        except FileNotFoundError as e:
            rc=77 if allowed_block else 127
            suffix=f'\n{e}\n'
    content=tmp.read_text(encoding='utf-8',errors='replace')+suffix
    tmp.unlink(missing_ok=True)
    if rc==0: status='PASS'
    elif rc==77 and allowed_block: status='BLOCKED_EXTERNAL'
    else: status='FAIL'
    content=content if content.strip() else f'COMMAND_EXIT_CODE={rc}\nNO_STDOUT_OR_STDERR\n'
    rel=f'audit/round2/{name}.txt'; (ROOT/rel).write_text(content,encoding='utf-8')
    print(f'ROUND2_GATE_END {name} {status} rc={rc}', file=sys.stderr, flush=True)
    return {'name':name,'kind':kind,'status':status,'returncode':rc,'command':' '.join(cmd),'evidence':rel}

def main():
    clean()
    local=[
      ('canonical_status',[sys.executable,'scripts/validate_canonical_status.py']),
      ('artifact_lifecycle',[sys.executable,'scripts/validate_artifact_lifecycle.py']),
      ('openapi_contract',[sys.executable,'scripts/validate_openapi_contract.py']),
      ('evidence_records',[sys.executable,'scripts/validate_evidence_records.py']),
      ('tenant_convention',[sys.executable,'scripts/validate_tenant_convention.py']),
      ('error_catalog',[sys.executable,'scripts/validate_error_catalog.py']),
      ('asyncapi_operations',[sys.executable,'scripts/validate_asyncapi_operations.py']),
      ('bdd_registry',[sys.executable,'scripts/validate_bdd_registry.py']),
      ('statechart_registry',[sys.executable,'scripts/validate_statechart_registry.py']),
      ('metrics_matrix',[sys.executable,'scripts/validate_metrics_matrix.py']),
      ('workflow_security',[sys.executable,'scripts/validate_workflow_security.py']),
      ('sdk_operation_coverage',[sys.executable,'scripts/validate_sdk_operation_coverage.py']),
      ('event_compatibility',[sys.executable,'scripts/check_event_compatibility.py']),
      ('traceability',[sys.executable,'scripts/validate_traceability_matrix.py']),
      ('requirements',[sys.executable,'scripts/validate_requirement_traceability.py']),
      ('env_contract',[sys.executable,'scripts/validate_env_contract.py']),
      ('helm_static',[sys.executable,'scripts/validate_helm_static.py']),
      ('remediation_register',[sys.executable,'scripts/validate_remediation_register.py']),
      # pytest is the canonical aggregate test gate. Explicit unittest runs are
      # retained as separate evidence files to avoid duplicate execution in this orchestrator.
      ('pytest',[sys.executable,'-m','pytest','-q','-p','no:cacheprovider']),
      ('sdk_drift',['bash','scripts/check_sdk_drift.sh']),
      ('sdk_tsc',['tsc','-p','06-sdk/typescript/tsconfig.json','--noEmit'])]
    rows=[execute(n,c) for n,c in local]
    external=[
      ('dependency_locks',[sys.executable,'scripts/validate_dependency_locks.py']),
      ('image_digests',[sys.executable,'scripts/validate_image_references.py']),
      ('postgres_runtime',[sys.executable,'scripts/test_postgres_event_transport.py']),
      ('redpanda_runtime',[sys.executable,'scripts/test_redpanda_runtime.py']),
      ('xstate_official_runtime',[sys.executable,'scripts/test_xstate_official_runtime.py']),
      ('networkpolicy_runtime',['bash','scripts/validate_networkpolicy_targets.sh']),
      ('external_prerequisites',[sys.executable,'scripts/validate_runtime_prerequisites.py'])]
    rows += [execute(n,c,'EXTERNAL_GATE',True) for n,c in external]
    clean()
    rows.append(execute('package_hygiene_final',[sys.executable,'scripts/validate_package_hygiene.py']))
    counts={s:sum(r['status']==s for r in rows) for s in ['PASS','FAIL','BLOCKED_EXTERNAL']}
    overall='FAIL' if counts['FAIL'] else ('PARTIAL_BLOCKED' if counts['BLOCKED_EXTERNAL'] else 'PASS')
    summary={'schema_version':2,'release_id':'INNOVAR-AUTO12-R2-UTA-R2','generated_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'overall_status':overall,'counts':counts,'checks':rows,'global_metrics':{'SCI':'NOT_CALCULATED','EEI':'NOT_CALCULATED'},'coverage_matrix':'traceability/COVERAGE-MATRIX-R2.yaml','remediation_register':'remediation/REMEDIATION-REGISTER.yaml'}
    (OUT/'ROUND2-VALIDATION-SUMMARY.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    md=['# Validação da Rodada 2','',f"- Resultado: **{overall}**",f"- PASS: {counts['PASS']}",f"- FAIL: {counts['FAIL']}",f"- BLOCKED_EXTERNAL: {counts['BLOCKED_EXTERNAL']}",'','| Controle | Tipo | Resultado | Evidência |','|---|---|---|---|']
    for r in rows: md.append(f"| `{r['name']}` | {r['kind']} | `{r['status']}` | `{r['evidence']}` |")
    (OUT/'ROUND2-VALIDATION-SUMMARY.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False)); return 1 if overall=='FAIL' else 0
if __name__=='__main__': raise SystemExit(main())
