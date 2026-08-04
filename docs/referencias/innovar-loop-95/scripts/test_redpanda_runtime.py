#!/usr/bin/env python3
import os,shutil

def main():
    endpoint=os.getenv('REDPANDA_BROKERS')
    rpk=shutil.which('rpk')
    if not endpoint or not rpk:
        missing=[]
        if not endpoint: missing.append('REDPANDA_BROKERS')
        if not rpk: missing.append('rpk')
        print('REDPANDA_RUNTIME: BLOCKED - missing '+', '.join(missing)); return 77
    print('REDPANDA_RUNTIME: BLOCKED - dedicated publish/consume harness requires authorized broker credentials'); return 77
if __name__=='__main__': raise SystemExit(main())
