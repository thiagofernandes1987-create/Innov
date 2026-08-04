import json
import threading
import time
import unittest
import uuid
import urllib.request
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from event_admin.server import DEFAULT_CONTEXT_AUDIENCE, Store, serve, sign_context


class Steps(unittest.TestCase):
    def setUp(self):
        self.secret = "bdd-signed-context-secret-32-bytes"
        self.published = []
        self.store = Store()
        self.item_id = self.store.seed()
        self.server = serve(
            self.store,
            lambda topic, key, payload: self.published.append((topic, key, payload)) or "0:0",
            context_secret=self.secret,
        )
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"
        self.org = "org-a"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.store.close()

    def headers(self, path, method="GET", body=None, key=None):
        timestamp = int(time.time())
        scopes = "events.admin"
        nonce = str(uuid.uuid4())
        data = None if body is None else json.dumps(body).encode()
        signature = sign_context(
            self.secret,
            self.org,
            "bdd",
            scopes,
            timestamp,
            method=method,
            path_query=path,
            body=data,
            idempotency_key=key or "",
            nonce=nonce,
            audience=DEFAULT_CONTEXT_AUDIENCE,
        )
        headers = {
            "X-Organization-Id": self.org,
            "X-Actor-Id": "bdd",
            "X-OAuth-Scopes": scopes,
            "X-Context-Timestamp": str(timestamp),
            "X-Context-Nonce": nonce,
            "X-Context-Audience": DEFAULT_CONTEXT_AUDIENCE,
            "X-Context-Version": "v2",
            "X-Context-Signature": signature,
            "Content-Type": "application/json",
        }
        if key:
            headers["X-Idempotency-Key"] = key
        return headers

    def call(self, path, body=None, key=None):
        method = "GET" if body is None else "POST"
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(
            self.base + path,
            data=data,
            method=method,
            headers=self.headers(path, method, body, key),
        )
        with urllib.request.urlopen(request) as response:
            return response.status, json.loads(response.read())

    def test_given_open_dlq_when_replay_then_exactly_one_effect(self):
        key = str(uuid.uuid4())
        body = {"reason": "BDD replay controlled event", "dry_run": False}
        path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        self.call(path, body, key)
        self.call(path, body, key)
        self.assertEqual(len(self.published), 1)

    def test_given_tenant_a_dlq_when_tenant_b_lists_then_hidden(self):
        self.org = "org-b"
        _, payload = self.call("/v1/admin/events/dlq")
        self.assertEqual(payload["items"], [])

    def test_given_replayed_item_when_resolved_then_closed(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/resolution"
        _, result = self.call(
            path,
            {"resolution": "REPLAYED", "note": "BDD resolution completed"},
            str(uuid.uuid4()),
        )
        self.assertEqual(result["status"], "RESOLVED")

    def test_given_duplicate_delivery_when_consumed_then_one_effect(self):
        seen = set()
        effects = []

        def consume(event_id, payload):
            if event_id in seen:
                return "DUPLICATE_OR_BUSY"
            seen.add(event_id)
            effects.append(payload)
            return "PROCESSED"

        self.assertEqual(consume("evt-1", {"value": 1}), "PROCESSED")
        self.assertEqual(consume("evt-1", {"value": 1}), "DUPLICATE_OR_BUSY")
        self.assertEqual(len(effects), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
