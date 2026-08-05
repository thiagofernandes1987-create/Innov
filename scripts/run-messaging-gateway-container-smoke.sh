#!/usr/bin/env bash
set -euo pipefail

image="innov-messaging-gateway:w05-${GITHUB_SHA:-local}"
container="innov-messaging-gateway-w05-${GITHUB_RUN_ID:-$$}"
secret="0123456789abcdef0123456789abcdef"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker image rm -f "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --pull=false -f apps/messaging-gateway/Dockerfile -t "$image" .

configured_user="$(docker image inspect "$image" --format '{{.Config.User}}')"
if [[ "$configured_user" != "10001:10001" ]]; then
  echo "Imagem executa como usuário inesperado: $configured_user" >&2
  exit 1
fi

docker run -d \
  --name "$container" \
  --read-only \
  --tmpfs /tmp:size=16m,noexec,nosuid,nodev \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 256m \
  --cpus 0.50 \
  --ulimit nofile=1024:2048 \
  --network none \
  -e GATEWAY_HOST=127.0.0.1 \
  -e GATEWAY_PORT=8787 \
  -e GATEWAY_INSTANCE_ID=container-smoke \
  -e GATEWAY_HMAC_SECRET="$secret" \
  "$image" >/dev/null

ready=false
for _ in $(seq 1 20); do
  if docker exec "$container" node -e \
    "fetch('http://127.0.0.1:8787/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    ready=true
    break
  fi
  sleep 0.5
done
if [[ "$ready" != "true" ]]; then
  docker logs "$container" >&2 || true
  echo "Gateway não ficou ready dentro do container." >&2
  exit 1
fi

docker exec "$container" node -e \
  "fetch('http://127.0.0.1:8787/health').then(async r=>{const b=await r.json();if(!r.ok||b.status!=='ok')process.exit(1)}).catch(()=>process.exit(1))"
docker exec "$container" node -e \
  "fetch('http://127.0.0.1:8787/metrics').then(async r=>{const b=await r.text();if(!r.ok||!b.includes('innov_gateway_ready 1'))process.exit(1)}).catch(()=>process.exit(1))"

runtime_user="$(docker exec "$container" node -e 'process.stdout.write(`${process.getuid()}:${process.getgid()}`)')"
if [[ "$runtime_user" != "10001:10001" ]]; then
  echo "Processo executa como usuário inesperado: $runtime_user" >&2
  exit 1
fi

docker stop --time 5 "$container" >/dev/null
logs="$(docker logs "$container" 2>&1)"
grep -q 'gateway_started' <<<"$logs"
grep -q 'gateway_shutdown_completed' <<<"$logs"

printf '%s\n' '{"ok":true,"contract":"messaging-gateway-container-v1","user":"10001:10001","network":"none","readOnly":true,"fakeClientOnly":true}'
