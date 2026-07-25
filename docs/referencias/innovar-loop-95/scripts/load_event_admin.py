#!/usr/bin/env python3
import argparse
import concurrent.futures
import json
import os
import statistics
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from event_admin.server import DEFAULT_CONTEXT_AUDIENCE, sign_context

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--requests', type=int, default=100)
parser.add_argument('--concurrency', type=int, default=10)
parser.add_argument('--organization-id', default='00000000-0000-4000-8000-000000000001')
parser.add_argument('--actor-id', default='load-test')
parser.add_argument('--context-secret', default=os.getenv('EVENT_ADMIN_CONTEXT_SECRET'))
args = parser.parse_args()
if not args.context_secret or len(args.context_secret) < 32:
    raise SystemExit('EVENT_ADMIN_CONTEXT_SECRET or --context-secret with at least 32 characters is required')

parsed = urllib.parse.urlsplit(args.url)
path_query = parsed.path + (('?' + parsed.query) if parsed.query else '')


def one(_):
    timestamp = int(time.time())
    nonce = str(uuid.uuid4())
    scopes = 'events.admin'
    signature = sign_context(
        args.context_secret,
        args.organization_id,
        args.actor_id,
        scopes,
        timestamp,
        method='GET',
        path_query=path_query,
        nonce=nonce,
        audience=DEFAULT_CONTEXT_AUDIENCE,
    )
    request = urllib.request.Request(
        args.url,
        headers={
            'X-Organization-Id': args.organization_id,
            'X-Actor-Id': args.actor_id,
            'X-OAuth-Scopes': scopes,
            'X-Context-Timestamp': str(timestamp),
            'X-Context-Nonce': nonce,
            'X-Context-Audience': DEFAULT_CONTEXT_AUDIENCE,
            'X-Context-Version': 'v2',
            'X-Context-Signature': signature,
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            code = response.status
    except Exception as exc:
        code = getattr(exc, 'code', 0)
    return code, (time.perf_counter() - started) * 1000


with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
    rows = list(executor.map(one, range(args.requests)))
latencies = [row[1] for row in rows]
codes = {str(code): sum(1 for observed, _ in rows if observed == code) for code in {row[0] for row in rows}}
print(
    json.dumps(
        {
            'requests': args.requests,
            'concurrency': args.concurrency,
            'codes': codes,
            'p50_ms': statistics.median(latencies),
            'p95_ms': sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)],
            'max_ms': max(latencies),
        },
        indent=2,
    )
)
raise SystemExit(0 if all(200 <= code < 500 for code, _ in rows) else 1)
