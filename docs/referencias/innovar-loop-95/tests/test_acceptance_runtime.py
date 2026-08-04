import unittest
from reference_runtime.runtime import InMemoryRuntime,ObjectDefinition,DomainError

class AcceptanceRuntimeTests(unittest.TestCase):
    def setUp(self): self.r=InMemoryRuntime()
    def err(self,code,fn):
        with self.assertRaises(DomainError) as c: fn()
        self.assertEqual(c.exception.code,code)

    def test_publish_expected_version_records_outbox(self):
        self.r.put(ObjectDefinition('A','invoice','IN_REVIEW',3))
        obj=self.r.transition('A','invoice','PUBLISH',3)
        self.assertEqual((obj.state,obj.version),('PUBLISHED',4))
        self.assertEqual(self.r.outbox[-1]['event_type'],'metadata.object.transitioned.v1')

    def test_stale_transition_has_no_event(self):
        self.r.put(ObjectDefinition('A','invoice','IN_REVIEW',4))
        self.err('VERSION_CONFLICT',lambda:self.r.transition('A','invoice','PUBLISH',3))
        self.assertEqual(self.r.outbox,[])

    def test_published_version_is_immutable(self):
        self.r.put(ObjectDefinition('A','invoice','PUBLISHED',4))
        self.err('PUBLISHED_VERSION_IMMUTABLE',lambda:self.r.mutate_fields('A','invoice',{'x':1}))

    def test_cross_tenant_read_discloses_nothing(self):
        self.r.put(ObjectDefinition('A','invoice'))
        self.err('NOT_FOUND',lambda:self.r.get('B','invoice'))

    def test_idempotency_replays_exact_response(self):
        calls=[]
        operation=lambda:(calls.append(1) or {'status':201,'headers':{'ETag':'"1"'},'body':{'id':'x'}})
        first=self.r.execute_idempotent('A','object.create','K',{'x':1},operation)
        second=self.r.execute_idempotent('A','object.create','K',{'x':1},operation)
        self.assertIs(first,second); self.assertEqual(len(calls),1)

    def test_idempotency_rejects_different_payload(self):
        self.r.execute_idempotent('A','object.create','K',{'x':1},lambda:{'status':201})
        self.err('IDEMPOTENCY_KEY_REUSED',lambda:self.r.execute_idempotent('A','object.create','K',{'x':2},lambda:{}))

    def test_same_key_is_independent_across_operations(self):
        a=self.r.execute_idempotent('A','object.create','K',{'x':1},lambda:{'operation':'create'})
        b=self.r.execute_idempotent('A','record.create','K',{'x':1},lambda:{'operation':'record'})
        self.assertNotEqual(a,b)

    def test_idempotency_is_tenant_scoped(self):
        a=self.r.execute_idempotent('A','object.create','K',{'x':1},lambda:{'tenant':'A'})
        b=self.r.execute_idempotent('B','object.create','K',{'x':2},lambda:{'tenant':'B'})
        self.assertNotEqual(a,b)

if __name__=='__main__': unittest.main(verbosity=2)
