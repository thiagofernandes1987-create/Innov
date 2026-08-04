#!/usr/bin/env python3
from pathlib import Path
import argparse,hashlib,json,collections,time
ROOT=Path(__file__).resolve().parents[1]
EXCLUDE={'SHA256SUMS.txt','audit/round2/ROUND2-FILE-INVENTORY.json','remediation/ROUND2-CHANGE-MANIFEST.json'}
def scan(root):
    out={}
    for p in root.rglob('*'):
        if not p.is_file(): continue
        rel=p.relative_to(root).as_posix()
        if rel in EXCLUDE or any(x in rel.split('/') for x in ('__pycache__','.pytest_cache','node_modules')) or p.suffix in {'.pyc','.pyo','.tmp'}: continue
        out[rel]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'suffix':p.suffix.lower() or '[none]','top_level':rel.split('/',1)[0]}
    return out
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',type=Path); a=ap.parse_args(); current=scan(ROOT)
    by_suffix=collections.Counter(v['suffix'] for v in current.values()); by_top=collections.Counter(v['top_level'] for v in current.values())
    inv={'schema_version':1,'release_id':'INNOVAR-AUTO12-R2','generated_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'scope':'all files except the inventory itself, change manifest, SHA256SUMS and prohibited generated caches','total_files':len(current),'counts_by_suffix':dict(sorted(by_suffix.items())),'counts_by_top_level':dict(sorted(by_top.items())),'files':[{'path':k,**v} for k,v in sorted(current.items())]}
    (ROOT/'audit/round2/ROUND2-FILE-INVENTORY.json').write_text(json.dumps(inv,indent=2,ensure_ascii=False)+'\n')
    if a.source:
        source=scan(a.source); added=sorted(set(current)-set(source)); removed=sorted(set(source)-set(current)); modified=sorted(k for k in set(source)&set(current) if source[k]['sha256']!=current[k]['sha256'])
        ch={'schema_version':1,'release_id':'INNOVAR-AUTO12-R2','source_release':'INNOVAR-AUTO12','source_zip_sha256':'a38dfbac3ff539c1adc1aa4b1a692f4fc2661b5b0ffa0056faaefe73d03b0fb7','comparison_exclusions':sorted(EXCLUDE),'counts':{'source_files':len(source),'current_files':len(current),'added':len(added),'removed':len(removed),'modified':len(modified),'unchanged':len(set(source)&set(current))-len(modified)},'added':[{'path':k,**current[k]} for k in added],'removed':[{'path':k,**source[k]} for k in removed],'modified':[{'path':k,'source_sha256':source[k]['sha256'],'current_sha256':current[k]['sha256'],'source_bytes':source[k]['bytes'],'current_bytes':current[k]['bytes']} for k in modified]}
        (ROOT/'remediation/ROUND2-CHANGE-MANIFEST.json').write_text(json.dumps(ch,indent=2,ensure_ascii=False)+'\n')
    print(f'ROUND2_INVENTORY_GENERATED files={len(current)}')
if __name__=='__main__': main()
