import json,re,unittest
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]

class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text())
        cls.asyncapi=yaml.safe_load((ROOT/'02-events/asyncapi.yaml').read_text())

    def test_all_json_schemas_are_valid_draft_2020_12(self):
        for p in ROOT.rglob('*.schema.json'):
            Draft202012Validator.check_schema(json.loads(p.read_text()))

    def test_local_refs_exist(self):
        for p in [ROOT/'01-api/openapi.yaml',ROOT/'02-events/asyncapi.yaml']:
            for ref in re.findall(r"\$ref:\s*['\"]?([^'\"\s}]+)",p.read_text()):
                if ref.startswith('./'):
                    self.assertTrue((p.parent/ref).exists(),f'{p}: {ref}')

    def test_openapi_uses_strong_etags(self):
        for path,method in [('/v1/objects/{objectKey}/records/{recordId}','patch'),('/v1/objects/{objectKey}/transitions','post')]:
            op=self.api['paths'][path][method]
            param=next(p for p in op['parameters'] if p.get('name')=='If-Match')
            self.assertNotIn('W/',param['schema']['pattern'])
            self.assertTrue({'412','428'}.issubset(op['responses']))

    def test_only_executable_storage_strategy_is_exposed(self):
        enum=self.api['components']['schemas']['CreateObjectRequest']['properties']['storage_strategy']['enum']
        self.assertEqual(enum,['JSONB_HYBRID'])

    def test_transition_schema_is_closed_and_reasoned(self):
        schema=json.loads((ROOT/'01-api/schemas/transition-request.schema.json').read_text())
        self.assertEqual(set(schema['properties']['event']['enum']),{'SUBMIT_REVIEW','RETURN_DRAFT','PUBLISH','DEPRECATE','ARCHIVE'})
        Draft202012Validator(schema).validate({'event':'SUBMIT_REVIEW','expected_version':1})
        with self.assertRaises(Exception):
            Draft202012Validator(schema).validate({'event':'ARCHIVE','expected_version':1})

    def test_runtime_rls_has_policies(self):
        sql=(ROOT/'01-db/rls/0001_rls.sql').read_text()
        for table in ['state_machine_instances','state_machine_transitions','dead_letter_messages']:
            self.assertIn(f'FORCE ROW LEVEL SECURITY;',sql)
            self.assertRegex(sql,rf'CREATE POLICY [^\n]+ ON platform\.{table}')

    def test_published_version_immutability_has_database_enforcement(self):
        sql=(ROOT/'01-db/migrations/0004_evidence_hardening.sql').read_text()
        self.assertIn('PUBLISHED_VERSION_IMMUTABLE',sql)
        self.assertIn('object_versions_published_immutable',sql)
        self.assertIn('records_object_version_fk',sql)

    def test_dlq_dedupe_is_tenant_scoped(self):
        sql=(ROOT/'01-db/migrations/0004_evidence_hardening.sql').read_text()
        self.assertIn('UNIQUE (organization_id, consumer_name, source_event_id)',sql)

    def test_event_storage_strategy_matches_api(self):
        schema=json.loads((ROOT/'02-events/schemas/metadata/metadata.object.created.v1.schema.json').read_text())
        api_enum=self.api['components']['schemas']['CreateObjectRequest']['properties']['storage_strategy']['enum']
        self.assertEqual(schema['properties']['storage_strategy']['enum'],api_enum)

    def test_quota_function_rejects_invalid_inputs_and_public_execution(self):
        sql=(ROOT/'01-db/migrations/0005_security_contract_hardening.sql').read_text()
        self.assertIn('p_amount <= 0',sql)
        self.assertIn('p_expected_version <= 0',sql)
        self.assertRegex(sql,r'REVOKE ALL ON FUNCTION platform\.reserve_quota\(uuid,text,bigint,bigint\) FROM PUBLIC')

    def test_sdk_uses_strong_etag(self):
        src=(ROOT/'06-sdk/typescript/src/index.ts').read_text()
        self.assertNotIn('W/"${expectedVersion}"',src)
        self.assertIn('`"${expectedVersion}"`',src)

    def test_helm_service_selector_and_named_port_are_consistent(self):
        dep=(ROOT/'05-infra/helm/templates/deployment.yaml').read_text()
        svc=(ROOT/'05-infra/helm/templates/service.yaml').read_text()
        self.assertIn('app.kubernetes.io/name: {{ .Release.Name }}-api',dep)
        self.assertIn('app.kubernetes.io/name: {{ .Release.Name }}-api',svc)
        self.assertIn('name: http',dep)
        self.assertIn('targetPort: http',svc)
        self.assertIn('serviceAccountName: {{ .Release.Name }}',dep)

    def test_quota_has_single_canonical_signature(self):
        sql = "\n".join(p.read_text() for p in (ROOT / "01-db/migrations").glob("*.sql"))
        self.assertIn("DROP FUNCTION IF EXISTS platform.reserve_quota(uuid, varchar, bigint, bigint)", sql)
        self.assertIn("REVOKE ALL ON FUNCTION platform.reserve_quota(uuid,text,bigint,bigint) FROM PUBLIC", sql)

    def test_event_transport_tables_have_rls(self):
        sql = "\n".join(p.read_text() for p in (ROOT / "01-db").rglob("*.sql"))
        for table in ["domain_events", "outbox_messages", "consumer_inbox"]:
            self.assertIn(f"ALTER TABLE platform.{table} ENABLE ROW LEVEL SECURITY", sql)
            self.assertRegex(sql, rf"CREATE POLICY [^\n]+ ON platform\.{table}")

    def test_database_restricts_storage_strategy_to_executable_release(self):
        sql = "\n".join(p.read_text() for p in (ROOT / "01-db/migrations").glob("*.sql"))
        self.assertIn("CHECK (storage_strategy = 'JSONB_HYBRID')", sql)

    def test_object_definition_capability_has_18_scored_facets(self):
        matrix=yaml.safe_load((ROOT/'traceability/CAPABILITY-FACET-MATRIX.yaml').read_text())
        facets=matrix['capabilities']['object_definitions']['facets']
        self.assertEqual(len(facets),18)
        self.assertTrue(all('score' in value and 'evidence' in value for value in facets.values()))
        self.assertEqual(matrix['portfolio_sci']['status'],'NOT_CALCULATED')

    def test_object_definition_configuration_is_schema_bound(self):
        schema=json.loads((ROOT/'05-config/config.schema.json').read_text())
        for key in ['OBJECT_DEFINITION_MAX_FIELDS','OBJECT_SCHEMA_MAX_BYTES','OBJECT_PUBLISH_REQUIRE_REVIEW','OBJECT_BREAKING_CHANGE_POLICY']:
            self.assertIn(key,schema['properties'])
        env=(ROOT/'05-config/.env.example').read_text()
        for key in ['OBJECT_DEFINITION_MAX_FIELDS','OBJECT_SCHEMA_MAX_BYTES','OBJECT_PUBLISH_REQUIRE_REVIEW','OBJECT_BREAKING_CHANGE_POLICY']:
            self.assertIn(key+'=',env)

    def test_object_definition_runbook_preserves_immutability(self):
        text=(ROOT/'09-runbooks/object-definitions.md').read_text()
        self.assertIn('não editar versão `PUBLISHED` diretamente',text)
        self.assertIn('não desabilitar trigger de imutabilidade',text)


if __name__=='__main__': unittest.main(verbosity=2)
