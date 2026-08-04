#!/usr/bin/env python3
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
def main():
    errors=[]
    canonical='app.current_organization_id'
    adapter=(ROOT/'event_admin/postgres_store.py').read_text()
    m13=(ROOT/'01-db/migrations/0013_unify_execution_tenancy.sql').read_text()
    if canonical not in adapter: errors.append('ADAPTER_CANONICAL_CONTEXT_MISSING')
    if m13.count(canonical)<2: errors.append('MIGRATION_0013_CANONICAL_POLICIES_MISSING')
    if 'RENAME COLUMN tenant_id TO organization_id' not in m13: errors.append('LEGACY_COLUMN_REPAIR_MISSING')
    if errors:
        print('TENANT_CONVENTION_RESULT: FAIL'); print('\n'.join(errors)); return 1
    print('TENANT_CONVENTION_RESULT: PASS final_schema=organization_id context=app.current_organization_id'); return 0
if __name__=='__main__': raise SystemExit(main())
