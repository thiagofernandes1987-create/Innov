"""Executable outbox publisher using the Redpanda/Kafka REST Proxy HTTP API.
Database access is injected so the worker can be integration-tested independently.
"""
from dataclasses import dataclass
import json
import re
import urllib.request
from urllib.parse import quote

TOPIC_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,249}$")


def validate_topic_name(topic: str) -> str:
    if not isinstance(topic, str) or not TOPIC_PATTERN.fullmatch(topic) or topic in {".", ".."}:
        raise ValueError("INVALID_TOPIC_NAME")
    return topic


@dataclass(frozen=True)
class OutboxMessage:
    id: str
    topic: str
    partition_key: str
    payload: dict
    headers: dict
    attempts: int = 1


class RedpandaHttpPublisher:
    def __init__(self, base_url: str, timeout_seconds: float = 5):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds

    def publish(self, message: OutboxMessage) -> str:
        topic = quote(validate_topic_name(message.topic), safe="._-")
        body = json.dumps(
            {
                "records": [
                    {
                        "key": message.partition_key,
                        "value": message.payload,
                        "headers": [[key, value] for key, value in message.headers.items()],
                    }
                ]
            }
        ).encode()
        request = urllib.request.Request(
            f"{self.base_url}/topics/{topic}",
            data=body,
            headers={"Content-Type": "application/vnd.kafka.json.v2+json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            result = json.loads(response.read())
        offsets = result.get("offsets") or []
        if not offsets or offsets[0].get("error_code") not in (None, 0):
            raise RuntimeError(f"BROKER_PUBLISH_FAILED:{result}")
        return f"{offsets[0].get('partition', 0)}:{offsets[0].get('offset')}"


class OutboxWorker:
    def __init__(self, store, publisher, worker_id="event-publisher", batch_size=100, lease_seconds=60):
        self.store = store
        self.publisher = publisher
        self.worker_id = worker_id
        self.batch_size = batch_size
        self.lease_seconds = lease_seconds

    @staticmethod
    def retry_delay_seconds(attempts: int) -> int:
        return min(3600, 2 ** min(10, max(1, int(attempts))))

    def run_once(self, organization_id: str) -> dict:
        claimed = self.store.claim_outbox(
            organization_id, self.worker_id, self.batch_size, self.lease_seconds
        )
        published = failed = 0
        for message in claimed:
            try:
                provider_id = self.publisher.publish(message)
                self.store.complete_outbox(organization_id, message.id, self.worker_id, provider_id)
                published += 1
            except Exception as exc:
                self.store.fail_outbox(
                    organization_id,
                    message.id,
                    self.worker_id,
                    str(exc),
                    self.retry_delay_seconds(message.attempts),
                )
                failed += 1
        return {"claimed": len(claimed), "published": published, "failed": failed}
