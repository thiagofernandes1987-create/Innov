import importlib.util,json,tempfile,unittest,yaml,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from event_publisher.redpanda_http_publisher import OutboxMessage,OutboxWorker
class Store:
 def __init__(self,messages): self.messages=messages; self.failures=[]
 def claim_outbox(self,*args): return self.messages
 def complete_outbox(self,*args): raise AssertionError('unexpected success')
 def fail_outbox(self,*args): self.failures.append(args)
class Publisher:
 def publish(self,m): raise RuntimeError('failed')
class RemediationContractTests(unittest.TestCase):
 def test_backoff_progresses_from_attempt_count(self):
  store=Store([OutboxMessage('1','t','k',{}, {},1),OutboxMessage('2','t','k',{}, {},4)])
  result=OutboxWorker(store,Publisher()).run_once('org')
  self.assertEqual(result['failed'],2); self.assertEqual([x[-1] for x in store.failures],[2,16])
 def test_baseline_ids_are_disjoint_from_current_ids(self):
  base={json.loads(p.read_text())['$id'] for p in (ROOT/'02-events/compatibility-baseline').rglob('*.schema.json')}
  cur={d['$id'] for p in (ROOT/'02-events/schemas').rglob('*.schema.json') if '$id' in (d:=json.loads(p.read_text()))}
  self.assertTrue(base.isdisjoint(cur))
 def test_nested_breaking_change_is_detected(self):
  spec=importlib.util.spec_from_file_location('compat',ROOT/'scripts/check_event_compatibility.py'); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
  with tempfile.TemporaryDirectory() as td:
   base=Path(td)/'base'; cur=Path(td)/'cur'; base.mkdir(); cur.mkdir()
   old={'$schema':'https://json-schema.org/draft/2020-12/schema','type':'object','properties':{'nested':{'type':'object','properties':{'value':{'type':'string'}},'required':['value']}}}
   new={'$schema':'https://json-schema.org/draft/2020-12/schema','type':'object','properties':{'nested':{'type':'object','properties':{'value':{'type':'integer'}},'required':['value']}}}
   (base/'x.schema.json').write_text(json.dumps(old)); (cur/'x.schema.json').write_text(json.dumps(new))
   self.assertTrue(any('TYPE_NARROWED' in x for x in mod.check_directories(base,cur)))
 def test_sdk_inventory_is_semantic_and_source_bound(self):
  inv=json.loads((ROOT/'06-sdk/generated/openapi-operation-inventory.json').read_text())
  self.assertTrue(all('response_type' in x and 'required_headers' in x for x in inv['operations']))
  self.assertEqual(len(inv['operations']),13)
if __name__=='__main__': unittest.main()
