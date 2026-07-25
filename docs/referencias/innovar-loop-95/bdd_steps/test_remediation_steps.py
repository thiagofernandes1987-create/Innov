import json,threading,time,unittest,urllib.error,urllib.request,uuid,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from reference_runtime.runtime import InMemoryRuntime,ObjectDefinition,DomainError
from event_admin.server import DEFAULT_CONTEXT_AUDIENCE,Store,serve,sign_context
class RemediationBehaviorSteps(unittest.TestCase):
 def test_same_key_and_payload_replays_original_response(self):
  r=InMemoryRuntime(); calls=[]; op=lambda:(calls.append(1) or {'ok':True})
  self.assertIs(r.execute_idempotent('A','object.create','K',{'x':1},op),r.execute_idempotent('A','object.create','K',{'x':1},op)); self.assertEqual(len(calls),1)
 def test_same_key_with_different_payload_is_rejected(self):
  r=InMemoryRuntime(); r.execute_idempotent('A','object.create','K',{'x':1},lambda:{})
  with self.assertRaises(DomainError): r.execute_idempotent('A','object.create','K',{'x':2},lambda:{})
 def test_concurrent_key_reports_in_progress(self):
  r=InMemoryRuntime(); r.in_progress.add(('A','object.create','K'))
  with self.assertRaisesRegex(DomainError,'OPERATION_IN_PROGRESS'): r.execute_idempotent('A','object.create','K',{},lambda:{})
 def test_publish_under_expected_version(self):
  r=InMemoryRuntime(); r.put(ObjectDefinition('A','invoice','IN_REVIEW',3)); self.assertEqual(r.transition('A','invoice','PUBLISH',3).state,'PUBLISHED')
 def test_reject_stale_transition(self):
  r=InMemoryRuntime(); r.put(ObjectDefinition('A','invoice','IN_REVIEW',4))
  with self.assertRaisesRegex(DomainError,'VERSION_CONFLICT'): r.transition('A','invoice','PUBLISH',3)
 def test_reject_published_mutation(self):
  r=InMemoryRuntime(); r.put(ObjectDefinition('A','invoice','PUBLISHED',4))
  with self.assertRaisesRegex(DomainError,'PUBLISHED_VERSION_IMMUTABLE'): r.mutate_fields('A','invoice',{'x':1})
 def test_cross_tenant_read_denied(self):
  r=InMemoryRuntime(); r.put(ObjectDefinition('A','invoice'))
  with self.assertRaisesRegex(DomainError,'NOT_FOUND'): r.get('B','invoice')
 def test_organization_context_is_signed_server_side(self):
  secret='signed-context-secret-32-bytes-min'; store=Store(); srv=serve(store,lambda *x:'ok',context_secret=secret); threading.Thread(target=srv.serve_forever,daemon=True).start()
  try:
   ts=int(time.time()); org='A'; actor='u'; scopes='events.admin'; nonce=str(uuid.uuid4()); path='/v1/admin/events/dlq'; sig=sign_context(secret,org,actor,scopes,ts,method='GET',path_query=path,nonce=nonce,audience=DEFAULT_CONTEXT_AUDIENCE)
   req=urllib.request.Request(f'http://127.0.0.1:{srv.server_port}'+path,headers={'X-Organization-Id':org,'X-Actor-Id':actor,'X-OAuth-Scopes':scopes,'X-Context-Timestamp':str(ts),'X-Context-Nonce':nonce,'X-Context-Audience':DEFAULT_CONTEXT_AUDIENCE,'X-Context-Version':'v2','X-Context-Signature':sig})
   with urllib.request.urlopen(req) as response: self.assertEqual(response.status,200)
  finally: srv.shutdown(); srv.server_close(); store.close()
if __name__=='__main__': unittest.main()
