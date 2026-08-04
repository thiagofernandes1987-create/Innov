from __future__ import annotations

import hashlib
import hmac
import json
import sqlite3
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qsl, urlencode, urlsplit

MAX_BODY_BYTES = 65_536
CONTEXT_CLOCK_SKEW_SECONDS = 300
CONTEXT_SIGNATURE_VERSION = "v2"
DEFAULT_CONTEXT_AUDIENCE = "innovar-event-admin"

SCHEMA = """
CREATE TABLE IF NOT EXISTS dlq(
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  consumer_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  created_at REAL NOT NULL,
  resolved_at REAL,
  resolution TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS replay_audit(
  id TEXT PRIMARY KEY,
  dlq_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  operation_scope TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  dry_run INTEGER NOT NULL,
  provider_message_id TEXT,
  created_at REAL NOT NULL,
  UNIQUE(organization_id, operation_scope, dlq_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS resolution_audit(
  id TEXT PRIMARY KEY,
  dlq_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  operation_scope TEXT NOT NULL,
  actor TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at REAL NOT NULL,
  UNIQUE(organization_id, operation_scope, dlq_id, idempotency_key)
);
"""


class AuthenticationError(Exception):
    pass


class AuthorizationError(Exception):
    pass


class ValidationError(Exception):
    pass


class BodyTooLargeError(Exception):
    pass


class NonceCache:
    """Process-local anti-replay cache for trusted-proxy context assertions."""

    def __init__(self, ttl_seconds: int = CONTEXT_CLOCK_SKEW_SECONDS):
        self.ttl_seconds = ttl_seconds
        self._seen: dict[str, int] = {}
        self._lock = threading.Lock()

    def consume(self, nonce: str, timestamp: int) -> bool:
        now = int(time.time())
        with self._lock:
            cutoff = now - self.ttl_seconds
            self._seen = {key: ts for key, ts in self._seen.items() if ts >= cutoff}
            if nonce in self._seen:
                return False
            self._seen[nonce] = timestamp
            return True


class Store:
    def __init__(self, path: str = ":memory:"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        self.db.executescript(SCHEMA)

    def close(self):
        self.db.close()

    def seed(self, org="org-a", consumer="projection", topic="metadata.object.created.v1", payload=None):
        item_id = str(uuid.uuid4())
        event_id = str(uuid.uuid4())
        self.db.execute(
            "INSERT INTO dlq(id,organization_id,consumer_name,event_id,topic,payload,last_error,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (
                item_id,
                org,
                consumer,
                event_id,
                topic,
                json.dumps(payload or {"event_id": event_id, "value": 1}),
                "boom",
                time.time(),
            ),
        )
        self.db.commit()
        return item_id

    @staticmethod
    def _dead_letter(row):
        if row is None:
            return None
        return {
            "id": row["id"],
            "event_id": row["event_id"],
            "consumer_name": row["consumer_name"],
            "event_type": row["topic"],
            "attempts": row["attempts"],
            "failed_at": _iso(row["created_at"]),
            "status": row["status"],
            "last_error": row["last_error"],
            "resolved_at": _iso(row["resolved_at"]) if row["resolved_at"] is not None else None,
        }

    def list(self, org, consumer=None):
        query = "SELECT * FROM dlq WHERE organization_id=?"
        args = [org]
        if consumer:
            query += " AND consumer_name=?"
            args.append(consumer)
        return [self._dead_letter(row) for row in self.db.execute(query + " ORDER BY created_at,id", args)]

    def get(self, org, item_id):
        return self.db.execute(
            "SELECT * FROM dlq WHERE organization_id=? AND id=?", (org, item_id)
        ).fetchone()

    def replay(self, org, item_id, actor, reason, key, dry_run, publisher):
        scope = "dlq.replay"
        request_hash = _semantic_hash({"reason": reason, "dry_run": bool(dry_run)})
        with self.lock:
            old = self.db.execute(
                "SELECT * FROM replay_audit WHERE organization_id=? AND operation_scope=? AND dlq_id=? AND idempotency_key=?",
                (org, scope, item_id, key),
            ).fetchone()
            if old:
                if old["request_hash"] != request_hash:
                    raise ValueError("IDEMPOTENCY_KEY_REUSED")
                return _replay_response(old), False
            row = self.get(org, item_id)
            if not row:
                raise KeyError("NOT_FOUND")
            if row["status"] != "OPEN":
                raise ValueError("DEPENDENCY_CONFLICT")
            provider = None
            if not dry_run:
                provider = publisher(row["topic"], row["event_id"], json.loads(row["payload"]))
            replay_id = str(uuid.uuid4())
            now = time.time()
            self.db.execute(
                "INSERT INTO replay_audit(id,dlq_id,organization_id,operation_scope,actor,reason,idempotency_key,request_hash,dry_run,provider_message_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (
                    replay_id,
                    item_id,
                    org,
                    scope,
                    actor,
                    reason,
                    key,
                    request_hash,
                    1 if dry_run else 0,
                    provider,
                    now,
                ),
            )
            self.db.commit()
            created = self.db.execute("SELECT * FROM replay_audit WHERE id=?", (replay_id,)).fetchone()
            return _replay_response(created), True

    def resolve(self, org, item_id, actor, resolution, note, key):
        scope = "dlq.resolve"
        request_hash = _semantic_hash({"resolution": resolution, "note": note})
        with self.lock:
            old = self.db.execute(
                "SELECT request_hash,response_json FROM resolution_audit WHERE organization_id=? AND operation_scope=? AND dlq_id=? AND idempotency_key=?",
                (org, scope, item_id, key),
            ).fetchone()
            if old:
                if old["request_hash"] != request_hash:
                    raise ValueError("IDEMPOTENCY_KEY_REUSED")
                return json.loads(old["response_json"]), False
            row = self.get(org, item_id)
            if not row:
                raise KeyError("NOT_FOUND")
            if row["status"] != "OPEN":
                raise ValueError("DEPENDENCY_CONFLICT")
            self.db.execute(
                'UPDATE dlq SET status="RESOLVED",resolution=?,note=?,resolved_at=? WHERE organization_id=? AND id=?',
                (resolution, note, time.time(), org, item_id),
            )
            response = self._dead_letter(self.get(org, item_id))
            audit_id = str(uuid.uuid4())
            self.db.execute(
                "INSERT INTO resolution_audit(id,dlq_id,organization_id,operation_scope,actor,idempotency_key,request_hash,response_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (
                    audit_id,
                    item_id,
                    org,
                    scope,
                    actor,
                    key,
                    request_hash,
                    json.dumps(response, separators=(",", ":")),
                    time.time(),
                ),
            )
            self.db.commit()
            return response, True


def _iso(value):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(value))


def _semantic_hash(value: dict) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _replay_response(row):
    return {
        "id": row["id"],
        "dead_letter_id": row["dlq_id"],
        "status": "ACCEPTED",
        "dry_run": bool(row["dry_run"]),
        "provider_message_id": row["provider_message_id"],
        "created_at": _iso(row["created_at"]),
    }


def canonical_path_query(path_query: str) -> str:
    parsed = urlsplit(path_query)
    pairs = sorted(parse_qsl(parsed.query, keep_blank_values=True))
    query = urlencode(pairs, doseq=True)
    return parsed.path + ("?" + query if query else "")


def body_sha256(body: bytes | bytearray | None) -> str:
    return hashlib.sha256(bytes(body or b"")).hexdigest()


def sign_context(
    secret: str,
    organization_id: str,
    actor_id: str,
    scopes: str,
    timestamp: int,
    *,
    method: str,
    path_query: str,
    body: bytes | bytearray | None = None,
    idempotency_key: str = "",
    nonce: str,
    audience: str = DEFAULT_CONTEXT_AUDIENCE,
) -> str:
    normalized_scopes = " ".join(sorted(filter(None, scopes.split())))
    message = "\n".join(
        [
            CONTEXT_SIGNATURE_VERSION,
            organization_id,
            actor_id,
            normalized_scopes,
            str(timestamp),
            nonce,
            audience,
            method.upper(),
            canonical_path_query(path_query),
            body_sha256(body),
            idempotency_key,
        ]
    ).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


class AdminHttpServer(ThreadingHTTPServer):
    daemon_threads = True
    block_on_close = False


class AdminHandler(BaseHTTPRequestHandler):
    store = None
    publisher = None
    context_secret = None
    context_audience = DEFAULT_CONTEXT_AUDIENCE
    nonce_cache = None
    max_body_bytes = MAX_BODY_BYTES

    def _json(self, status, data):
        encoded = json.dumps(data, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _problem(self, status, code, title):
        self._json(
            status,
            {
                "type": f"https://innovar.local/problems/{code.lower()}",
                "title": title,
                "status": status,
                "code": code,
            },
        )

    def _body_bytes(self) -> bytes:
        cached = getattr(self, "_cached_body_bytes", None)
        if cached is not None:
            return cached
        raw_length = self.headers.get("Content-Length")
        if raw_length is None:
            self._cached_body_bytes = b""
            return b""
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise ValidationError("VALIDATION_FAILED") from exc
        if length < 0 or length > self.max_body_bytes:
            raise BodyTooLargeError("PAYLOAD_TOO_LARGE")
        self._cached_body_bytes = self.rfile.read(length)
        return self._cached_body_bytes

    def _ctx(self):
        org = self.headers.get("X-Organization-Id")
        actor = self.headers.get("X-Actor-Id")
        raw_scopes = self.headers.get("X-OAuth-Scopes") or ""
        timestamp_raw = self.headers.get("X-Context-Timestamp")
        signature = self.headers.get("X-Context-Signature")
        nonce = self.headers.get("X-Context-Nonce")
        audience = self.headers.get("X-Context-Audience")
        version = self.headers.get("X-Context-Version")
        if not all((org, actor, timestamp_raw, signature, nonce, audience, version, self.context_secret)):
            raise AuthenticationError("UNAUTHENTICATED")
        if version != CONTEXT_SIGNATURE_VERSION or audience != self.context_audience:
            raise AuthenticationError("UNAUTHENTICATED")
        try:
            timestamp = int(timestamp_raw)
            uuid.UUID(nonce)
        except (ValueError, TypeError) as exc:
            raise AuthenticationError("UNAUTHENTICATED") from exc
        if abs(int(time.time()) - timestamp) > CONTEXT_CLOCK_SKEW_SECONDS:
            raise AuthenticationError("UNAUTHENTICATED")
        idempotency_key = self.headers.get("X-Idempotency-Key") or ""
        body = self._body_bytes() if self.command.upper() in {"POST", "PUT", "PATCH"} else b""
        expected = sign_context(
            self.context_secret,
            org,
            actor,
            raw_scopes,
            timestamp,
            method=self.command,
            path_query=self.path,
            body=body,
            idempotency_key=idempotency_key,
            nonce=nonce,
            audience=audience,
        )
        if not hmac.compare_digest(expected, signature):
            raise AuthenticationError("UNAUTHENTICATED")
        if not self.nonce_cache.consume(nonce, timestamp):
            raise AuthenticationError("UNAUTHENTICATED")
        scopes = set(filter(None, raw_scopes.split()))
        if "events.admin" not in scopes:
            raise AuthorizationError("FORBIDDEN")
        return org, actor

    def _body(self):
        raw = self._body_bytes()
        if not raw:
            return {}
        try:
            body = json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("VALIDATION_FAILED") from exc
        if not isinstance(body, dict):
            raise ValidationError("VALIDATION_FAILED")
        return body

    def _idempotency_key(self):
        key = self.headers.get("X-Idempotency-Key")
        if not key:
            raise ValidationError("PRECONDITION_REQUIRED")
        try:
            uuid.UUID(key)
        except ValueError as exc:
            raise ValidationError("VALIDATION_FAILED") from exc
        return key

    def do_GET(self):
        try:
            org, _ = self._ctx()
            parsed = urlsplit(self.path)
            if parsed.path != "/v1/admin/events/dlq":
                return self._problem(404, "NOT_FOUND", "Resource not found")
            items = self.store.list(org, dict(parse_qsl(parsed.query)).get("consumer"))
            self._json(200, {"items": items})
        except AuthenticationError:
            self._problem(401, "UNAUTHENTICATED", "Authentication required")
        except AuthorizationError:
            self._problem(403, "FORBIDDEN", "Insufficient scope")

    def do_POST(self):
        try:
            org, actor = self._ctx()
            path = urlsplit(self.path).path
            parts = path.strip("/").split("/")
            body = self._body()
            if len(parts) == 6 and parts[:4] == ["v1", "admin", "events", "dlq"] and parts[5] == "replay":
                key = self._idempotency_key()
                reason = body.get("reason")
                if not isinstance(reason, str) or not reason.strip():
                    raise ValidationError("VALIDATION_FAILED")
                result, created = self.store.replay(
                    org,
                    parts[4],
                    actor,
                    reason.strip(),
                    key,
                    bool(body.get("dry_run", True)),
                    self.publisher,
                )
                return self._json(202 if created else 200, result)
            if len(parts) == 6 and parts[:4] == ["v1", "admin", "events", "dlq"] and parts[5] == "resolution":
                key = self._idempotency_key()
                resolution = body.get("resolution")
                note = body.get("note")
                if not isinstance(resolution, str) or not isinstance(note, str):
                    raise ValidationError("VALIDATION_FAILED")
                result, _ = self.store.resolve(org, parts[4], actor, resolution, note, key)
                return self._json(200, result)
            self._problem(404, "NOT_FOUND", "Resource not found")
        except KeyError:
            self._problem(404, "NOT_FOUND", "Resource not found")
        except ValueError as exc:
            self._problem(409, str(exc), "Operation conflict")
        except AuthenticationError:
            self._problem(401, "UNAUTHENTICATED", "Authentication required")
        except AuthorizationError:
            self._problem(403, "FORBIDDEN", "Insufficient scope")
        except BodyTooLargeError:
            self._problem(413, "PAYLOAD_TOO_LARGE", "Payload too large")
        except ValidationError as exc:
            status = 428 if str(exc) == "PRECONDITION_REQUIRED" else 422
            self._problem(status, str(exc), "Request validation failed")
        except Exception:
            self._problem(500, "INTERNAL_ERROR", "Internal server error")

    def log_message(self, *args):
        pass


def _handler_factory(store, publisher, context_secret, max_body_bytes, context_audience):
    class BoundAdminHandler(AdminHandler):
        pass

    BoundAdminHandler.store = store
    BoundAdminHandler.publisher = staticmethod(publisher)
    BoundAdminHandler.context_secret = context_secret
    BoundAdminHandler.max_body_bytes = max_body_bytes
    BoundAdminHandler.context_audience = context_audience
    BoundAdminHandler.nonce_cache = NonceCache()
    return BoundAdminHandler


def serve(
    store,
    publisher,
    host="127.0.0.1",
    port=0,
    context_secret=None,
    max_body_bytes=MAX_BODY_BYTES,
    context_audience=DEFAULT_CONTEXT_AUDIENCE,
):
    if not context_secret or len(context_secret) < 32:
        raise ValueError("context_secret must contain at least 32 characters")
    if not context_audience:
        raise ValueError("context_audience is required")
    handler = _handler_factory(store, publisher, context_secret, max_body_bytes, context_audience)
    return AdminHttpServer((host, port), handler)
