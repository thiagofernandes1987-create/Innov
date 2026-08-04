from pathlib import Path
import yaml,re,sys
R=Path(__file__).resolve().parents[1]/'05-infra/helm'; errors=[]
yaml.safe_load((R/'Chart.yaml').read_text()); values=yaml.safe_load((R/'values.yaml').read_text())
required=['templates/event-publisher-deployment.yaml','templates/event-publisher-hpa.yaml','templates/serviceaccount.yaml']
for rel in required:
 p=R/rel
 if not p.exists(): errors.append('missing '+rel)
for p in (R/'templates').glob('*.yaml'):
 t=p.read_text()
 if '\t' in t: errors.append(f'tab indentation: {p.name}')
# cross-resource invariants independent of Helm rendering
D=(R/'templates/event-publisher-deployment.yaml').read_text(); H=(R/'templates/event-publisher-hpa.yaml').read_text()
for token in ['serviceAccountName: {{ .Release.Name }}','app.kubernetes.io/component: event-publisher','EVENT_BROKER_URL']:
 if token not in D: errors.append('deployment missing '+token)
for token in ['kind: HorizontalPodAutoscaler','type: External','innovar_outbox_ready_messages']:
 if token not in H: errors.append('hpa missing '+token)
print('HELM_STATIC_VALIDATION:', 'PASS' if not errors else 'FAIL')
for e in errors: print('-',e)
sys.exit(bool(errors))
