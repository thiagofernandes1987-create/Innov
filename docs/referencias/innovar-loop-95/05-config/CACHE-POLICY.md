# Cache

## Provider

Redis-compatible.

## Chaves

```text
metadata:object_def:{organization_id}:{namespace}:{object_key}
metadata:object_version:{organization_id}:{object_definition_id}:{version}
authz:effective_access:{organization_id}:{user_id}:{resource_id}
```

## Política

- Cache-aside.
- Metadata TTL: 60 segundos.
- Negative cache: 10 segundos.
- Authorization TTL: máximo 30 segundos.
- Stampede: lock distribuído de 5 segundos.
- Redis indisponível: fallback ao banco; nunca falhar autorização aberta.
- Invalidação: evento `metadata.object.published.v1`.
- Mensagem de invalidação contém tenant, object ID e versão.
