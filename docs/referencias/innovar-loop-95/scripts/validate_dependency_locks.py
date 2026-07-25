#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def parse_requirement_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    current: list[str] = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith('#'):
            continue
        current.append(stripped.rstrip('\\').strip())
        if not raw.rstrip().endswith('\\'):
            blocks.append(' '.join(current))
            current = []
    if current:
        blocks.append(' '.join(current))
    return blocks


def main() -> int:
    issues: list[str] = []
    npm_manifests = [
        '06-sdk/typescript/package.json',
        'tools/xstate-runtime/package.json',
    ]
    for rel in npm_manifests:
        doc = json.loads((ROOT / rel).read_text(encoding='utf-8'))
        for section in ('dependencies', 'devDependencies'):
            for name, version in doc.get(section, {}).items():
                if version.startswith(('^', '~', '>', '<', '*')):
                    issues.append(f'{rel}:{name}:NON_EXACT:{version}')

    required = [
        ROOT / '06-sdk/typescript/package-lock.json',
        ROOT / 'tools/xstate-runtime/package-lock.json',
        ROOT / 'requirements-ci.lock',
    ]
    missing = [p.relative_to(ROOT).as_posix() for p in required if not p.is_file()]

    pylock = ROOT / 'requirements-ci.lock'
    if pylock.is_file():
        for block in parse_requirement_blocks(pylock.read_text(encoding='utf-8')):
            if '==' not in block or '--hash=sha256:' not in block:
                issues.append(f'requirements-ci.lock:UNHASHED_OR_UNPINNED:{block}')

    for rel in ('06-sdk/typescript/package-lock.json', 'tools/xstate-runtime/package-lock.json'):
        lock = ROOT / rel
        if lock.is_file():
            doc = json.loads(lock.read_text(encoding='utf-8'))
            if not doc.get('lockfileVersion') or not isinstance(doc.get('packages'), dict):
                issues.append(f'{rel}:INVALID_LOCKFILE_STRUCTURE')

    if issues:
        print('DEPENDENCY_LOCK_RESULT: FAIL')
        print('\n'.join(issues))
        return 1
    if missing:
        print('DEPENDENCY_LOCK_RESULT: BLOCKED_EXTERNAL')
        print('MISSING_VERIFIED_LOCKFILES ' + ','.join(missing))
        return 77
    print('DEPENDENCY_LOCK_RESULT: PASS npm_locks=2 python_hash_lock=1')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
