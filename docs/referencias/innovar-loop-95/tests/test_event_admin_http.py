import json
import threading
import time
import unittest
import urllib.error
import urllib.request
import uuid
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from event_admin.server import (
    DEFAULT_CONTEXT_AUDIENCE,
    Store,
    serve,
    sign_context,
)


class EventAdminHttpTests(unittest.TestCase):
    def setUp(self):
        self.secret = "test-secret-with-at-least-32-bytes"
        self.published = []
        self.store = Store()
        self.item_id = self.store.seed()
        self.server = serve(
            self.store,
            lambda topic, key, payload: self.published.append((topic, key, payload)) or f"{key}:0",
            context_secret=self.secret,
        )
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.store.close()

    @staticmethod
    def encode(body):
        return None if body is None else json.dumps(body).encode()

    def signed_headers(
        self,
        path,
        method="GET",
        body=None,
        org="org-a",
        actor="a",
        scopes="events.admin",
        key=None,
        nonce=None,
        audience=DEFAULT_CONTEXT_AUDIENCE,
    ):
        timestamp = int(time.time())
        nonce = nonce or str(uuid.uuid4())
        data = self.encode(body)
        signature = sign_context(
            self.secret,
            org,
            actor,
            scopes,
            timestamp,
            method=method,
            path_query=path,
            body=data,
            idempotency_key=key or "",
            nonce=nonce,
            audience=audience,
        )
        headers = {
            "X-Organization-Id": org,
            "X-Actor-Id": actor,
            "X-OAuth-Scopes": scopes,
            "X-Context-Timestamp": str(timestamp),
            "X-Context-Nonce": nonce,
            "X-Context-Audience": audience,
            "X-Context-Version": "v2",
            "X-Context-Signature": signature,
        }
        if key:
            headers["X-Idempotency-Key"] = key
        return headers

    def request(self, path, method="GET", body=None, headers=None, raw=None):
        data = raw if raw is not None else self.encode(body)
        request = urllib.request.Request(
            self.base + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json", **(headers or {})},
        )
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def call_signed(self, path, method="GET", body=None, **kwargs):
        return self.request(
            path,
            method,
            body,
            self.signed_headers(path, method, body, **kwargs),
        )

    def test_unsigned_context_is_rejected(self):
        headers = {
            "X-Organization-Id": "org-a",
            "X-Actor-Id": "a",
            "X-OAuth-Scopes": "events.admin",
        }
        self.assertEqual(self.request("/v1/admin/events/dlq", headers=headers)[0], 401)

    def test_events_admin_scope_is_forbidden(self):
        self.assertEqual(
            self.call_signed("/v1/admin/events/dlq", scopes="objects.read")[0],
            403,
        )

    def test_context_signature_is_bound_to_route_and_method(self):
        headers = self.signed_headers("/v1/admin/events/dlq", "GET")
        status, _ = self.request(
            f"/v1/admin/events/dlq/{self.item_id}/replay",
            "POST",
            {"reason": "different request"},
            headers,
        )
        self.assertEqual(status, 401)

    def test_nonce_cannot_be_replayed(self):
        headers = self.signed_headers("/v1/admin/events/dlq")
        self.assertEqual(self.request("/v1/admin/events/dlq", headers=headers)[0], 200)
        self.assertEqual(self.request("/v1/admin/events/dlq", headers=headers)[0], 401)

    def test_idempotency_key_is_required(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        body = {"reason": "controlled replay", "dry_run": False}
        status, response = self.call_signed(path, "POST", body)
        self.assertEqual((status, response["code"]), (428, "PRECONDITION_REQUIRED"))

    def test_replay_is_idempotent_over_http(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        key = str(uuid.uuid4())
        body = {"reason": "controlled replay", "dry_run": False}
        self.assertEqual(self.call_signed(path, "POST", body, key=key)[0], 202)
        self.assertEqual(self.call_signed(path, "POST", body, key=key)[0], 200)
        self.assertEqual(len(self.published), 1)

    def test_same_key_on_different_dlq_resources_does_not_collide(self):
        other_id = self.store.seed("org-a")
        key = str(uuid.uuid4())
        body = {"reason": "resource-scoped replay", "dry_run": True}
        first_path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        second_path = f"/v1/admin/events/dlq/{other_id}/replay"
        first = self.call_signed(first_path, "POST", body, key=key)
        second = self.call_signed(second_path, "POST", body, key=key)
        self.assertEqual(first[0], 202)
        self.assertEqual(second[0], 202)
        self.assertNotEqual(first[1]["id"], second[1]["id"])

    def test_same_resource_and_key_with_different_payload_is_rejected(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        key = str(uuid.uuid4())
        self.assertEqual(
            self.call_signed(path, "POST", {"reason": "first", "dry_run": True}, key=key)[0],
            202,
        )
        status, response = self.call_signed(
            path,
            "POST",
            {"reason": "changed", "dry_run": True},
            key=key,
        )
        self.assertEqual((status, response["code"]), (409, "IDEMPOTENCY_KEY_REUSED"))

    def test_same_key_is_tenant_scoped(self):
        key = str(uuid.uuid4())
        other_id = self.store.seed("org-b")
        body_a = {"reason": "a"}
        body_b = {"reason": "b"}
        path_a = f"/v1/admin/events/dlq/{self.item_id}/replay"
        path_b = f"/v1/admin/events/dlq/{other_id}/replay"
        result_a = self.call_signed(path_a, "POST", body_a, org="org-a", key=key)[1]
        result_b = self.call_signed(path_b, "POST", body_b, org="org-b", key=key)[1]
        self.assertNotEqual(result_a["id"], result_b["id"])

    def test_resolution_is_idempotent(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/resolution"
        key = str(uuid.uuid4())
        body = {"resolution": "DISCARD", "note": "validated"}
        first = self.call_signed(path, "POST", body, key=key)
        second = self.call_signed(path, "POST", body, key=key)
        self.assertEqual(first, second)
        self.assertEqual(first[1]["status"], "RESOLVED")

    def test_server_instances_do_not_share_state_or_secret(self):
        other_store = Store()
        other_store.seed("org-b")
        other_secret = "second-test-secret-with-at-least-32-bytes"
        other_server = serve(other_store, lambda *_: "0:0", context_secret=other_secret)
        threading.Thread(target=other_server.serve_forever, daemon=True).start()
        try:
            status, payload = self.call_signed("/v1/admin/events/dlq")
            self.assertEqual(status, 200)
            self.assertEqual(len(payload["items"]), 1)
        finally:
            other_server.shutdown()
            other_server.server_close()
            other_store.close()

    def test_oversized_body_is_rejected_without_echoing_exception(self):
        path = f"/v1/admin/events/dlq/{self.item_id}/replay"
        raw = b"{" + b"x" * 70000
        # The body is rejected before signature validation; a syntactically complete signed context is still provided.
        headers = self.signed_headers(path, "POST", body={}, key=str(uuid.uuid4()))
        status, response = self.request(path, "POST", headers=headers, raw=raw)
        self.assertEqual(status, 413)
        self.assertNotIn("detail", response)


if __name__ == "__main__":
    unittest.main()
