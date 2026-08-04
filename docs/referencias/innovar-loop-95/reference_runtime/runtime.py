from __future__ import annotations
from dataclasses import dataclass, field
from hashlib import sha256
import json

class DomainError(Exception):
    def __init__(self, code: str):
        super().__init__(code); self.code=code

@dataclass
class ObjectDefinition:
    organization_id: str
    key: str
    state: str = 'DRAFT'
    version: int = 1
    fields: dict = field(default_factory=dict)

class InMemoryRuntime:
    transitions = {
        ('DRAFT','SUBMIT_REVIEW'):'IN_REVIEW',
        ('IN_REVIEW','RETURN_DRAFT'):'DRAFT',
        ('IN_REVIEW','PUBLISH'):'PUBLISHED',
        ('PUBLISHED','DEPRECATE'):'DEPRECATED',
        ('DEPRECATED','ARCHIVE'):'ARCHIVED',
    }
    def __init__(self):
        self.objects: dict[tuple[str,str],ObjectDefinition]={}
        self.outbox=[]
        self.idempotency={}
        self.in_progress=set()

    @staticmethod
    def _hash(payload: dict) -> str:
        raw=json.dumps(payload,sort_keys=True,separators=(',',':')).encode()
        return sha256(raw).hexdigest()

    def put(self,obj:ObjectDefinition):
        self.objects[(obj.organization_id,obj.key)]=obj

    def get(self,session_org:str,key:str):
        obj=self.objects.get((session_org,key))
        if not obj: raise DomainError('NOT_FOUND')
        return obj

    def transition(self,session_org:str,key:str,event:str,expected_version:int,reason:str|None=None):
        obj=self.get(session_org,key)
        if obj.version != expected_version: raise DomainError('VERSION_CONFLICT')
        target=self.transitions.get((obj.state,event))
        if not target: raise DomainError('INVALID_TRANSITION')
        if event in {'DEPRECATE','ARCHIVE'} and not reason: raise DomainError('REASON_REQUIRED')
        previous=obj.state; obj.state=target; obj.version += 1
        self.outbox.append({'event_type':'metadata.object.transitioned.v1','organization_id':session_org,'aggregate_id':key,'from':previous,'to':target,'aggregate_version':obj.version})
        return obj

    def mutate_fields(self,session_org:str,key:str,changes:dict):
        obj=self.get(session_org,key)
        if obj.state=='PUBLISHED': raise DomainError('PUBLISHED_VERSION_IMMUTABLE')
        obj.fields.update(changes); obj.version += 1
        return obj

    def execute_idempotent(self,org:str,operation_scope:str,key:str,payload:dict,operation):
        if not operation_scope: raise DomainError('OPERATION_SCOPE_REQUIRED')
        scope=(org,operation_scope,key); digest=self._hash(payload)
        if scope in self.in_progress: raise DomainError('OPERATION_IN_PROGRESS')
        prior=self.idempotency.get(scope)
        if prior:
            if prior['hash'] != digest: raise DomainError('IDEMPOTENCY_KEY_REUSED')
            return prior['response']
        self.in_progress.add(scope)
        try:
            response=operation()
            self.idempotency[scope]={'hash':digest,'response':response}
            return response
        finally:
            self.in_progress.discard(scope)
