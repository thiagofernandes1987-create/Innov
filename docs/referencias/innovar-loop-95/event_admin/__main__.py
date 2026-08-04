from __future__ import annotations
import os
from .server import Store, serve

def main():
    secret=os.environ.get('TRUSTED_PROXY_CONTEXT_SECRET')
    if not secret: raise SystemExit('TRUSTED_PROXY_CONTEXT_SECRET is required')
    host=os.environ.get('EVENT_ADMIN_HOST','0.0.0.0'); port=int(os.environ.get('PORT','3000'))
    db_path=os.environ.get('EVENT_ADMIN_SQLITE_PATH','/data/event-admin.sqlite3')
    store=Store(db_path)
    server=serve(store,lambda topic,key,payload: f'{key}:reference',host,port,context_secret=secret)
    try: server.serve_forever()
    finally: server.server_close(); store.close()
if __name__=='__main__': main()
