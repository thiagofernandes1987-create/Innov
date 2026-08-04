import json,unittest,subprocess,sys,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,HTTPServer
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from event_publisher.redpanda_http_publisher import RedpandaHttpPublisher,OutboxMessage,validate_topic_name
class Handler(BaseHTTPRequestHandler):
 def do_POST(self):
  n=int(self.headers['Content-Length']); self.server.body=json.loads(self.rfile.read(n)); self.send_response(200); self.end_headers(); self.wfile.write(b'{"offsets":[{"partition":0,"offset":42,"error_code":0}]}')
 def log_message(self,*a): pass
class Tests(unittest.TestCase):
 def test_sql_has_atomic_append_and_complete_inbox_lifecycle(self):
  s=(ROOT/'01-db/migrations/0007_event_transport_execution.sql').read_text()
  for token in ['append_domain_event_and_outbox','claim_outbox','FOR UPDATE SKIP LOCKED','complete_outbox_publish','fail_outbox_publish','claim_inbox','complete_inbox','fail_inbox','OUTBOX_LEASE_LOST','INBOX_LEASE_LOST']:
   self.assertIn(token,s)
 def test_admin_api_has_dlq_list_replay_and_resolution(self):
  import yaml
  a=yaml.safe_load((ROOT/'01-api/openapi.yaml').read_text())
  for p in ['/v1/admin/events/dlq','/v1/admin/events/dlq/{deadLetterId}/replay','/v1/admin/events/dlq/{deadLetterId}/resolution']: self.assertIn(p,a['paths'])
  self.assertIn('events.admin',a['components']['securitySchemes']['oauth2']['flows']['authorizationCode']['scopes'])
 def test_publisher_executes_against_http_broker_contract(self):
  srv=HTTPServer(('127.0.0.1',0),Handler); t=threading.Thread(target=srv.handle_request); t.start()
  p=RedpandaHttpPublisher(f'http://127.0.0.1:{srv.server_port}')
  pid=p.publish(OutboxMessage('1','metadata.object.created.v1','agg-1',{'x':1},{'event_id':'e1'})); t.join(); srv.server_close()
  self.assertEqual(pid,'0:42'); self.assertEqual(srv.body['records'][0]['key'],'agg-1')

 def test_publisher_rejects_topic_path_injection(self):
  for topic in ('../admin?x=1','bad/topic','topic#fragment','..'):
   with self.assertRaises(ValueError): validate_topic_name(topic)
 def test_event_compatibility_gate_passes(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/check_event_compatibility.py')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stdout+r.stderr)
 def test_helm_has_dedicated_publisher_and_external_backlog_hpa(self):
  dep=(ROOT/'05-infra/helm/templates/event-publisher-deployment.yaml').read_text(); hpa=(ROOT/'05-infra/helm/templates/event-publisher-hpa.yaml').read_text()
  self.assertIn('event-publisher',dep); self.assertIn('innovar_outbox_ready_messages',hpa); self.assertIn('type: External',hpa)
 def test_game_day_has_measurable_acceptance(self):
  s=(ROOT/'09-runbooks/event-transport-game-day.md').read_text()
  for x in ['RTO observado','zero mensagens perdidas','duplicatas de efeito = 0','rollback']: self.assertIn(x,s)
if __name__=='__main__': unittest.main(verbosity=2)
