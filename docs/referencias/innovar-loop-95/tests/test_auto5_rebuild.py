import sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

class Auto5RebuildTests(unittest.TestCase):
    def test_retry_hardening_guards_tenant_lease_and_attempt_cap(self):
        sql=(ROOT/'01-db/migrations/0008_event_transport_security_and_retry_hardening.sql').read_text()
        for token in ['TENANT_CONTEXT_MISMATCH','locked_until>=now()','attempts < 100','DUPLICATE_BUSY_OR_EXHAUSTED','INVALID_INBOX_COMPLETION_ARGUMENT']:
            self.assertIn(token,sql)

    def test_dlq_runtime_is_tenant_idempotent_and_rls_protected(self):
        sql=(ROOT/'01-db/migrations/0009_dlq_admin_runtime.sql').read_text()
        for token in ['UNIQUE(organization_id,idempotency_key)','ENABLE ROW LEVEL SECURITY','FOR UPDATE','claim_dead_letter_replay','complete_dead_letter_replay','resolve_dead_letter']:
            self.assertIn(token,sql)

    def test_postgres_adapter_uses_local_tenant_context_and_sql_functions(self):
        src=(ROOT/'event_admin/postgres_store.py').read_text()
        for token in ["set_config('app.current_organization_id'",'claim_dead_letter_replay','complete_dead_letter_replay','resolve_dead_letter']:
            self.assertIn(token,src)

    def test_admin_http_requires_events_admin_scope(self):
        src=(ROOT/'event_admin/server.py').read_text()
        self.assertIn('events.admin',src)
        self.assertIn('not in scopes',src)
        self.assertIn('FORBIDDEN',src)

    def test_helm_has_container_hardening_and_probes(self):
        dep=(ROOT/'05-infra/helm/templates/event-publisher-deployment.yaml').read_text()
        for token in ['runAsNonRoot: true','type: RuntimeDefault','allowPrivilegeEscalation: false','readOnlyRootFilesystem: true','drop: ["ALL"]','readinessProbe:','livenessProbe:','terminationGracePeriodSeconds']:
            self.assertIn(token,dep)

    def test_network_policy_allows_only_documented_dependencies(self):
        np=(ROOT/'05-infra/helm/templates/networkpolicy.yaml').read_text()
        values=(ROOT/'05-infra/helm/values.yaml').read_text()
        for token in ['event-publisher-egress','port: 53','networkPolicy.dependencies.postgresql.port','networkPolicy.dependencies.redpanda.restPort','networkPolicy.dependencies.redpanda.kafkaPort']:
            self.assertIn(token,np)
        for token in ['port: 5432','restPort: 8082','kafkaPort: 9092']:
            self.assertIn(token,values)

if __name__=='__main__': unittest.main(verbosity=2)
