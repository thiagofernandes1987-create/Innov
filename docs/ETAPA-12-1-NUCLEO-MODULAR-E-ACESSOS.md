# Etapa 12.1 — Núcleo Modular e Controle de Acesso

**Estado:** código implementado e migrations aplicadas na homologação.  
**Objetivo:** transformar a Innovar Platform em uma plataforma plug-and-play baseada em aplicativos, permissões e perfis configuráveis.

## Entregas

- catálogo de aplicativos em `app_modules`;
- dependências entre módulos;
- módulos habilitados, desabilitados ou arquivados por organização;
- perfis configuráveis;
- múltiplos perfis por usuário;
- perfis com escopo por organização, cliente ou obra;
- overrides individuais por organização e por obra;
- negação explícita com precedência;
- auditoria administrativa;
- dashboard dinâmico;
- menu dinâmico;
- proteção de rota no servidor;
- fallback temporário para papéis existentes;
- perfis iniciais de Direção, Administrador, Vendas, Financeiro, Orçamentista, Operacional, Engenharia, Qualidade, Pós-venda, Cliente e Usuário comum.

## Estrutura reutilizada e ampliada

O Supabase já possuía um núcleo modular. A Etapa 12.1 evoluiu essa estrutura, evitando tabelas paralelas:

- `app_modules`;
- `app_module_dependencies`;
- `organization_modules`;
- `access_profiles`;
- `profile_module_permissions`;
- `organization_memberships`;
- `user_module_permission_overrides`;
- `project_module_permission_overrides`;
- `permission_change_events`;
- `membership_access_profiles` — nova tabela para múltiplos perfis e escopos.

## Níveis visuais

- `NONE` — sem acesso;
- `READ` — somente leitura;
- `READ_WRITE` — criar, ler, editar e exportar;
- `FULL` — leitura, edição, exclusão e capacidades avançadas.

O banco utiliza `NONE`, `READ`, `EDIT` e `DELETE`. A interface converte esses níveis sem perder as capacidades independentes:

- aprovar;
- liberar ao cliente;
- assinar;
- exportar;
- administrar;
- visualizar dados sensíveis.

## Resolução efetiva

```text
módulo ativo no catálogo
→ módulo habilitado na organização
→ perfil principal do vínculo
→ perfis adicionais da organização
→ perfil do cliente relacionado à obra
→ perfil específico da obra
→ override do usuário
→ override da obra
→ DENY prevalece
→ RLS e regras do domínio
```

A função `effective_module_permissions` agrega os perfis sem depender do nome do papel. `list_my_modules` alimenta dashboard e menu. `has_module_permission` protege rotas e ações.

## Administração

A área administrativa permite:

- habilitar ou desabilitar módulos respeitando dependências;
- impedir desativação de módulos de núcleo;
- criar perfis novos sem alteração de código;
- configurar nível por módulo;
- atribuir vários perfis ao mesmo usuário;
- restringir perfil a cliente ou obra;
- conceder ou negar capacidade individual;
- registrar justificativa e auditoria.

## Segurança

- menu oculto não é considerado autorização;
- `proxy.ts` valida `READ` antes de abrir a rota;
- Server Actions administrativas exigem `administracao.manage`;
- RPCs `SECURITY DEFINER` fazem a verificação interna;
- `membership_access_profiles` possui RLS;
- escrita direta por usuários autenticados foi revogada;
- toda alteração administrativa registra ator, afetado, módulo, perfil, justificativa e dados anteriores/posteriores.

## Migrations

1. `20260720043000_stage12_1_module_catalog_multi_profiles.sql`;
2. `20260720043100_stage12_1_permission_resolution.sql`;
3. `20260720043200_stage12_1_module_security.sql`;
4. `20260720043300_stage12_1_project_capability_override.sql`.

## Homologação estrutural

As quatro migrations foram aplicadas no projeto Supabase de homologação.

Teste transacional com organização efêmera:

- 21 módulos instalados;
- 17 módulos habilitados por padrão;
- 12 perfis criados;
- perfil `usuario-comum` criado;
- 231 permissões de perfil geradas;
- transação revertida após a validação.

## Compatibilidade

Os papéis antigos permanecem como fallback durante a transição. O fallback somente deverá ser removido depois dos testes autenticados com administrador, usuário comum, usuário operacional e usuário com perfis combinados.

## Próximas migrações por aplicativo

Cada domínio deverá substituir gradualmente verificações de papel por capacidades:

```ts
await requireCapability("orcamentos", "update");
await requireCapability("obras", "read", projectId);
await requireCapability("assinaturas", "sign");
```

As políticas RLS atuais permanecem como segunda barreira até sua atualização controlada.

## Critérios de aceite

- [x] catálogo de aplicativos no banco;
- [x] dependências declaradas;
- [x] módulos habilitáveis por organização;
- [x] perfis criados sem alteração de código;
- [x] múltiplos perfis por usuário;
- [x] escopo por organização, cliente e obra;
- [x] overrides por usuário e por obra;
- [x] dashboard e menu dinâmicos;
- [x] bloqueio de URL direta;
- [x] auditoria administrativa;
- [x] migrations aplicadas em homologação;
- [x] bootstrap organizacional testado com rollback;
- [ ] testes autenticados administrador x usuário comum;
- [ ] migração das RLS de cada aplicativo para capacidades;
- [ ] remoção do fallback legado.
