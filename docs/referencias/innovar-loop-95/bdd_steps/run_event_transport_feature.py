from __future__ import annotations
import json, re, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FEATURE=ROOT/'04-bdd/features/event-transport-executable.feature'
REPORT=ROOT/'audit/BDD-GHERKIN-BINDING-RESULT.json'
IMPLEMENTED={
 'replay de DLQ exige escopo administrativo, motivo e idempotência':'test_given_open_dlq_when_replay_then_exactly_one_effect',
 'consumidor duplicado não reaplica efeito':'test_given_duplicate_delivery_when_consumed_then_one_effect',
}
EXTERNAL={
 'rollback do agregado também remove evento e outbox':'requires PostgreSQL via TEST_DATABASE_URL',
 'dois publishers não reivindicam a mesma mensagem':'requires PostgreSQL concurrency via TEST_DATABASE_URL',
}
def main():
 text=FEATURE.read_text(encoding='utf-8')
 scenarios=[x.strip() for x in re.findall(r'^\s*Scenario:\s*(.+)$',text,re.M)]
 results=[]; failed=0
 for s in scenarios:
  if s in IMPLEMENTED:
   p=subprocess.run([sys.executable,'-m','unittest',f'bdd_steps.test_event_transport_steps.Steps.{IMPLEMENTED[s]}','-v'],cwd=ROOT,text=True,capture_output=True)
   status='PASS' if p.returncode==0 else 'FAIL'; failed += p.returncode!=0
   results.append({'scenario':s,'status':status,'binding':IMPLEMENTED[s],'evidence':(p.stdout+p.stderr)[-1600:]})
  elif s in EXTERNAL:
   results.append({'scenario':s,'status':'BLOCKED','reason':EXTERNAL[s]})
  else:
   results.append({'scenario':s,'status':'UNBOUND'}); failed+=1
 report={'feature':str(FEATURE.relative_to(ROOT)),'scenario_count':len(scenarios),'passed':sum(r['status']=='PASS' for r in results),'blocked':sum(r['status']=='BLOCKED' for r in results),'unbound':sum(r['status']=='UNBOUND' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'results':results,'generated_at_epoch':time.time()}
 REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print(json.dumps(report,indent=2,ensure_ascii=False))
 return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
