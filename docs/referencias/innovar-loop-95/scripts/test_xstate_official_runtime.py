#!/usr/bin/env python3
from pathlib import Path
import shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]; P=ROOT/'tools/xstate-runtime'

def main():
    if not shutil.which('npm'):
        print('XSTATE_OFFICIAL_RUNTIME: BLOCKED - npm missing'); return 77
    if not (P/'package-lock.json').is_file():
        print('XSTATE_OFFICIAL_RUNTIME: BLOCKED - verified package-lock.json missing'); return 77
    install=subprocess.run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],cwd=P,text=True,capture_output=True)
    print(install.stdout+install.stderr,end='')
    if install.returncode: print('XSTATE_OFFICIAL_RUNTIME: FAIL - npm ci'); return install.returncode
    test=subprocess.run(['npm','test'],cwd=P,text=True,capture_output=True)
    print(test.stdout+test.stderr,end='')
    print('XSTATE_OFFICIAL_RUNTIME: PASS' if test.returncode==0 else 'XSTATE_OFFICIAL_RUNTIME: FAIL')
    return test.returncode
if __name__=='__main__': raise SystemExit(main())
