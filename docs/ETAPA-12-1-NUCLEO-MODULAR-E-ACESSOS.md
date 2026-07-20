# Etapa 12.1 — Núcleo Modular e Controle de Acesso

**Estado:** implementado na branch; homologação de runtime pendente.  
**Objetivo:** transformar a Innovar Platform em uma plataforma plug-and-play baseada em aplicativos, capacidades e perfis configuráveis.

## Entregas

- catálogo de aplicativos;
- aplicativos habilitados por organização;
- catálogo padronizado de capacidades;
- perfis configuráveis;
- múltiplos perfis por usuário;
- escopo por organização, cliente ou obra;
- overrides individuais `ALLOW` e `DENY`;
- negação explícita com precedência;
- auditoria administrativa;
- dashboard dinâmico;
- menu dinâmico;
- proteção de rota no servidor;
- fallback temporário para papéis existentes;
- perfis iniciais de Direção, Administrador, Vendas, Financeiro, Orçamentista, Operacional, Engenharia, Qualidade, Pós-venda, Cliente e Usuário comum.

## Tabelas

- `applications`;
- `organization_applications`;
- `application_capabilities`;
- `access_profiles`;
- `profile_capabilities`;
- `user_profile_assignments`;
- `user_capability_overrides`;
- `permission_audit_events`.

## Níveis visuais

- `NONE` — sem acesso;
- `READ` — somente leitura;
- `READ_WRITE` — criar, ler, editar e exportar;
- `FULL` — capacidades completas do aplicativo.

Os níveis são atalhos administrativos. A autorização real continua granular por capacidade.

## Resolução efetiva

```text
aplicativo habilitado na organização
→ perfil ativo do usuário
→ capacidade concedida
→ escopo da atribuição
→ override individual
→ DENY prevalece sobre ALLOW
→ RLS e regras do domínio
```

## Compatibilidade

A migration converte memberships existentes em atribuições de perfis configuráveis. Durante a transição, a aplicação possui fallback para os papéis antigos caso a migration ainda não esteja aplicada. Esse fallback deverá ser removido somente após a homologação autenticada e a migração das políticas antigas de cada módulo.

## Segurança

- menu oculto não é considerado autorização;
- `proxy.ts` valida `read` antes de abrir a rota;
- Server Actions administrativas exigem `administration.manage`;
- alterações são feitas por RPCs `SECURITY DEFINER` com checagem interna;
- tabelas administrativas têm RLS;
- escrita direta por usuários autenticados é revogada;
- toda alteração registra ator, afetado, módulo, capacidade, justificativa e correlação.

## Próximas migrações por módulo

Cada domínio existente deverá substituir gradualmente checagens de nomes de papel por capacidades:

```ts
await requireCapability("budgets", "update");
await requireCapability("works", "read", projectId);
await requireCapability("signatures", "sign");
```

As RLS legadas permanecem como segunda barreira até sua substituição controlada.

## Critérios de aceite

- [x] catálogo de aplicativos no banco;
- [x] módulos habilitáveis por organização;
- [x] perfis criados sem alteração de código;
- [x] múltiplos perfis por usuário;
- [x] overrides individuais;
- [x] dashboard e menu dinâmicos;
- [x] bloqueio de URL direta;
- [x] auditoria administrativa;
- [x] CI e validador estrutural;
- [ ] migration aplicada em homologação;
- [ ] testes autenticados administrador x usuário comum;
- [ ] migração das RLS de cada aplicativo para capacidades;
- [ ] remoção do fallback legado.
