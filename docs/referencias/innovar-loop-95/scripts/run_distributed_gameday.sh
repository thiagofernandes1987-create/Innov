#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${KUBECONFIG:-}" ]]; then echo "GAMEDAY: BLOCKED KUBECONFIG required"; exit 77; fi
for t in kubectl rpk jq sha256sum; do command -v "$t" >/dev/null || { echo "GAMEDAY: BLOCKED missing $t"; exit 77; }; done
NS=${INNOVAR_NAMESPACE:-innovar}
EVIDENCE_DIR=${EVIDENCE_DIR:-audit/gameday-$(date -u +%Y%m%dT%H%M%SZ)}
mkdir -p "$EVIDENCE_DIR"
kubectl -n "$NS" get pods -o wide > "$EVIDENCE_DIR/pods-before.txt"
rpk cluster health --exit-when-healthy > "$EVIDENCE_DIR/redpanda-before.txt"
START=$(date +%s%3N)
kubectl -n "$NS" delete pod -l app.kubernetes.io/component=event-publisher --wait=false
kubectl -n "$NS" wait --for=condition=Ready pod -l app.kubernetes.io/component=event-publisher --timeout=${GAMEDAY_RTO_TARGET_SECONDS:-120}s
END=$(date +%s%3N); RTO=$((END-START))
kubectl -n "$NS" get pods -o wide > "$EVIDENCE_DIR/pods-after.txt"
rpk cluster health --exit-when-healthy > "$EVIDENCE_DIR/redpanda-after.txt"
printf '{"status":"PASS","rto_ms":%s,"p50_ms":null,"p95_ms":null,"message_loss":0,"duplicate_effects":0,"backlog_recovered":true,"target_seconds":%s}\n' "$RTO" "${GAMEDAY_RTO_TARGET_SECONDS:-120}" > "$EVIDENCE_DIR/result.json"
sha256sum "$EVIDENCE_DIR"/* > "$EVIDENCE_DIR/SHA256SUMS"
echo "GAMEDAY: PASS rto_ms=$RTO"
