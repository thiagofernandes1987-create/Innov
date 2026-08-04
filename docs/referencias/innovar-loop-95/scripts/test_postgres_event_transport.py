"""PostgreSQL integration evidence gate.
Exit 77 means infrastructure/dependency unavailable and MUST NOT be counted as PASS.
Importing this module has no side effects, so pytest collection remains safe.
"""
from __future__ import annotations
import concurrent.futures, os, pathlib, sys, uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
MIGRATIONS=sorted((ROOT/'01-db/migrations').glob('[0-9][0-9][0-9][0-9]_*.sql'))
RLS=ROOT/'01-db/rls/0001_rls.sql'

def main() -> int:
    url=os.getenv('TEST_DATABASE_URL')
    if not url:
        print('POSTGRES_EVENT_TRANSPORT: BLOCKED - TEST_DATABASE_URL not set'); return 77
    try:
        import psycopg
    except ImportError:
        print('POSTGRES_EVENT_TRANSPORT: BLOCKED - psycopg not installed'); return 77
    def scalar(sql,args=()):
        with psycopg.connect(url) as c, c.cursor() as cur:
            cur.execute(sql,args); return cur.fetchone()[0]
    with psycopg.connect(url,autocommit=True) as c, c.cursor() as cur:
        for p in MIGRATIONS: cur.execute(p.read_text())
        cur.execute(RLS.read_text())
    value=scalar('select gen_random_uuid()'); assert isinstance(value,uuid.UUID) and value.version==4
    expected=[
      'platform.claim_outbox(uuid,text,integer,integer)',
      'platform.complete_outbox_publish(uuid,uuid,text,text)',
      'platform.fail_outbox_publish(uuid,uuid,text,text,integer)',
      'platform.claim_inbox(uuid,text,uuid,text,integer)',
      'platform.complete_inbox(uuid,text,uuid,text)',
      'platform.fail_inbox(uuid,text,uuid,text,text,integer)',
      'platform.claim_dead_letter_replay(uuid,uuid,text,text,uuid,boolean,text)']
    for sig in expected: assert scalar('select to_regprocedure(%s)',(sig,)) is not None, sig
    with psycopg.connect(url,autocommit=True) as c, c.cursor() as cur:
        cur.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='innovar_tenant_a') THEN CREATE ROLE innovar_tenant_a NOLOGIN NOBYPASSRLS; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='innovar_tenant_b') THEN CREATE ROLE innovar_tenant_b NOLOGIN NOBYPASSRLS; END IF; END $$")
        cur.execute("select rolname,rolbypassrls from pg_roles where rolname in ('innovar_tenant_a','innovar_tenant_b') order by rolname")
        assert cur.fetchall()==[('innovar_tenant_a',False),('innovar_tenant_b',False)]
        cur.execute("select column_name from information_schema.columns where table_schema='public' and table_name in ('execution_evidence','runtime_configuration_audit') and column_name in ('tenant_id','organization_id') order by table_name,column_name")
        cols=[r[0] for r in cur.fetchall()]; assert cols==['organization_id','organization_id'], cols
        cur.execute("select policyname,qual,with_check from pg_policies where schemaname='public' and tablename in ('execution_evidence','runtime_configuration_audit')")
        policies=cur.fetchall(); assert policies and all('app.current_organization_id' in ((r[1] or '')+(r[2] or '')) for r in policies),policies
    text=(ROOT/'01-db/migrations/0007_event_transport_execution.sql').read_text(); assert 'FOR UPDATE SKIP LOCKED' in text
    org=uuid.uuid4()
    def claim(worker):
        with psycopg.connect(url) as c, c.cursor() as cur:
            cur.execute("select set_config('app.current_organization_id',%s,true)",(str(org),))
            cur.execute('select * from platform.claim_outbox(%s,%s,0,30)',(org,worker)); return cur.fetchall()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex: assert list(ex.map(claim,['worker-a','worker-b']))==[[],[]]
    sys.path.insert(0,str(ROOT)); from event_admin.postgres_store import PostgresAdminStore
    assert PostgresAdminStore(lambda: psycopg.connect(url)).list(str(uuid.uuid4()))==[]
    print(f'POSTGRES_EVENT_TRANSPORT: PASS migrations={len(MIGRATIONS)} uuid=v4 rls_roles=2 canonical_tenant_context=app.current_organization_id')
    return 0
if __name__=='__main__': raise SystemExit(main())
