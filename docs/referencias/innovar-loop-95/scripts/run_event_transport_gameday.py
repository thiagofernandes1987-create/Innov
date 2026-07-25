import json
import threading
import time
import uuid
import urllib.error
import urllib.request
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from event_admin.server import DEFAULT_CONTEXT_AUDIENCE, Store, serve, sign_context


class Broker:
    def __init__(self):
        self.messages = []
        self.available = False
        self.lock = threading.Lock()
        self.offset = 0

    def consume(self):
        if not self.available:
            raise RuntimeError('BROKER_UNAVAILABLE')
        with self.lock:
            batch = self.messages[self.offset:]
            self.offset = len(self.messages)
            return list(batch)

    def publish(self, topic, key, payload):
        if not self.available:
            raise RuntimeError('BROKER_UNAVAILABLE')
        with self.lock:
            self.messages.append({'topic': topic, 'key': key, 'payload': payload})
            return f'0:{len(self.messages) - 1}'


def signed_headers(secret, path, method='GET', body=None, key=None):
    timestamp = int(time.time())
    nonce = str(uuid.uuid4())
    scopes = 'events.admin'
    data = None if body is None else json.dumps(body).encode()
    signature = sign_context(
        secret,
        'org-a',
        'operator-1',
        scopes,
        timestamp,
        method=method,
        path_query=path,
        body=data,
        idempotency_key=key or '',
        nonce=nonce,
        audience=DEFAULT_CONTEXT_AUDIENCE,
    )
    headers = {
        'Content-Type': 'application/json',
        'X-Organization-Id': 'org-a',
        'X-Actor-Id': 'operator-1',
        'X-OAuth-Scopes': scopes,
        'X-Context-Timestamp': str(timestamp),
        'X-Context-Nonce': nonce,
        'X-Context-Audience': DEFAULT_CONTEXT_AUDIENCE,
        'X-Context-Version': 'v2',
        'X-Context-Signature': signature,
    }
    if key:
        headers['X-Idempotency-Key'] = key
    return headers


def request(base, secret, path, method='GET', body=None, key=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        base + path,
        data=data,
        method=method,
        headers=signed_headers(secret, path, method, body, key),
    )
    with urllib.request.urlopen(req, timeout=3) as response:
        return response.status, json.loads(response.read())


def main():
    secret = 'game-day-context-secret-with-32-bytes'
    broker = Broker()
    store = Store()
    dead_letter_id = store.seed(payload={'event_id': 'e-1', 'value': 7})
    server = serve(store, broker.publish, context_secret=secret)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    started = time.perf_counter()
    failures = []
    try:
        status, page = request(base, secret, '/v1/admin/events/dlq')
        assert status == 200 and len(page['items']) == 1
        path = f'/v1/admin/events/dlq/{dead_letter_id}/replay'
        key = str(uuid.uuid4())
        try:
            request(base, secret, path, 'POST', {'reason': 'game day broker unavailable', 'mode': 'SINGLE', 'dry_run': False}, key)
        except Exception:
            failures.append('broker_unavailable_observed')
        broker.available = True
        recovery_started = time.perf_counter()
        key2 = str(uuid.uuid4())
        body = {'reason': 'game day controlled replay', 'mode': 'SINGLE', 'dry_run': False}
        status, replay = request(base, secret, path, 'POST', body, key2)
        assert status == 202
        status, replayed = request(base, secret, path, 'POST', body, key2)
        assert status == 200 and len(broker.messages) == 1 and replayed['id'] == replay['id']
        consumed = broker.consume()
        assert len(consumed) == 1
        resolution_path = f'/v1/admin/events/dlq/{dead_letter_id}/resolution'
        status, resolved = request(
            base,
            secret,
            resolution_path,
            'POST',
            {'resolution': 'REPLAYED', 'note': 'Replay confirmado durante game day'},
            str(uuid.uuid4()),
        )
        assert status == 200 and resolved['status'] == 'RESOLVED'
        result = {
            'status': 'PASS',
            'scope': 'LOCAL_HTTP_CONTROLLED_BROKER_NOT_REDPANDA',
            'rto_observed_ms': round((time.perf_counter() - recovery_started) * 1000, 3),
            'total_duration_ms': round((time.perf_counter() - started) * 1000, 3),
            'messages_published': len(broker.messages),
            'messages_consumed': len(consumed),
            'duplicate_effects': 0,
            'lost_messages': 0,
            'failure_injection': failures,
            'postgres_executed': False,
            'redpanda_executed': False,
            'helm_executed': False,
        }
    finally:
        server.shutdown()
        server.server_close()
        store.close()
    print(json.dumps(result, indent=2))
    (ROOT / 'audit/GAMEDAY-RESULT-EVENT-TRANSPORT.json').write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
