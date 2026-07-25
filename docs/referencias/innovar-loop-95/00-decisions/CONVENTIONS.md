# Convenções obrigatórias

## IDs

- Tipo físico: `uuid`.
- Gerados server-side.
- IDs nunca carregam significado de negócio.
- Chaves de componentes usam `namespace.key`.

## Tenancy

- Toda tabela de negócio contém `organization_id uuid NOT NULL`.
- PK lógica sempre inclui tenant na unicidade.
- RLS usa `app.current_organization_id`.
- Código cliente nunca escolhe tenant livremente.

## Concorrência

- Agregados mutáveis possuem `version bigint NOT NULL DEFAULT 1`.
- Updates usam `WHERE id = ? AND organization_id = ? AND version = expected_version`.
- Zero linhas atualizadas retorna `VERSION_CONFLICT`.
- Locks pessimistas somente para reserva de recursos e operações financeiras críticas.

## Erros

Formato canônico:

```json
{
  "type": "https://errors.innovar.app/version-conflict",
  "title": "Version conflict",
  "status": 409,
  "code": "VERSION_CONFLICT",
  "detail": "The record changed after it was read.",
  "request_id": "uuid",
  "errors": []
}
```

## Paginação

- `page[size]`: 1..200, default 50.
- `page[after]`: cursor opaco.
- Offset pagination não é usada em endpoints de alto volume.

## Idioma e tempo

- Banco armazena `timestamptz`.
- API recebe `Accept-Language`.
- Header opcional `X-Timezone`; default da organização.
- Moeda ISO 4217.
