from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
from typing import Any, Callable


def _request_hash(value: dict[str, Any]) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return sha256(encoded).hexdigest()


@dataclass
class PostgresAdminStore:
    """Reference adapter. Expects a DB-API 2.0 connection factory (for example psycopg.connect)."""

    connect: Callable[[], Any]

    @staticmethod
    def _set_tenant(cur: Any, organization_id: str) -> None:
        cur.execute("SELECT set_config('app.current_organization_id', %s, true)", (organization_id,))

    def list(self, organization_id: str, consumer: str | None = None) -> list[dict[str, Any]]:
        with self.connect() as conn, conn.cursor() as cur:
            self._set_tenant(cur, organization_id)
            sql = "SELECT id,consumer_name,source_event_id,event_type,event_version,payload,status,last_error,failed_at,resolved_at,resolution_note FROM platform.dead_letter_messages WHERE organization_id=%s"
            args: list[Any] = [organization_id]
            if consumer:
                sql += " AND consumer_name=%s"
                args.append(consumer)
            sql += " ORDER BY failed_at,id LIMIT 100"
            cur.execute(sql, tuple(args))
            columns = [description.name for description in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]

    def replay(
        self,
        organization_id: str,
        dead_letter_id: str,
        actor: str,
        reason: str,
        idempotency_key: str,
        dry_run: bool,
        publisher: Callable[[str, str, dict], str],
    ):
        request_hash = _request_hash({"reason": reason, "dry_run": bool(dry_run)})
        with self.connect() as conn, conn.cursor() as cur:
            self._set_tenant(cur, organization_id)
            cur.execute(
                "SELECT replay_id,created,event_type,source_event_id,payload FROM platform.claim_dead_letter_replay(%s,%s,%s,%s,%s,%s,%s)",
                (
                    organization_id,
                    dead_letter_id,
                    actor,
                    reason,
                    idempotency_key,
                    dry_run,
                    request_hash,
                ),
            )
            replay_id, created, event_type, event_id, payload = cur.fetchone()
            provider = None
            if not dry_run and created:
                provider = publisher(event_type, str(event_id), payload)
                cur.execute(
                    "SELECT platform.complete_dead_letter_replay(%s,%s,%s)",
                    (organization_id, replay_id, provider),
                )
            return {
                "id": str(replay_id),
                "organization_id": organization_id,
                "provider_message_id": provider,
                "dry_run": dry_run,
            }, bool(created)

    def resolve(
        self,
        organization_id: str,
        dead_letter_id: str,
        actor: str,
        resolution: str,
        note: str,
        idempotency_key: str,
    ):
        request_hash = _request_hash({"resolution": resolution, "note": note})
        with self.connect() as conn, conn.cursor() as cur:
            self._set_tenant(cur, organization_id)
            cur.execute(
                "SELECT resolution_id,created,dead_letter_id,status,resolution_code,resolution_note,resolved_at FROM platform.resolve_dead_letter_idempotent(%s,%s,%s,%s,%s,%s,%s)",
                (
                    organization_id,
                    dead_letter_id,
                    actor,
                    resolution,
                    note,
                    idempotency_key,
                    request_hash,
                ),
            )
            _, created, resolved_id, _, _, _, _ = cur.fetchone()
            cur.execute(
                "SELECT id,consumer_name,source_event_id,event_type,attempts,failed_at,last_error,resolved_at,status FROM platform.dead_letter_messages WHERE organization_id=%s AND id=%s",
                (organization_id, resolved_id),
            )
            row = cur.fetchone()
            columns = [description.name for description in cur.description]
            result = dict(zip(columns, row))
            result["id"] = str(result["id"])
            result["event_id"] = str(result.pop("source_event_id"))
            result["resolved_at"] = result["resolved_at"].isoformat() if result["resolved_at"] else None
            result["failed_at"] = result["failed_at"].isoformat()
            return result, bool(created)
