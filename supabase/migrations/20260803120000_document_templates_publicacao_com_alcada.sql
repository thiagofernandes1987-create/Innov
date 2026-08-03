-- Publicar modelo é alçada, e alçada não vive só na tela — VACINA-041.
--
-- A primeira migration deste motor deixou publicar sob a mesma régua de salvar:
-- `EDIT` no módulo. A tela, porém, exige `approve`, que na plataforma só existe
-- no nível FULL. Enquanto os dois discordarem, a regra da tela é decorativa:
-- quem tem `EDIT` publica pela API sem passar por ela.
--
-- Rascunho continua sendo do autor — `EDIT` cria, edita e salva o quanto
-- quiser. **Publicado é da organização**: passa a valer para todo mundo que
-- emite documento daquele módulo, e o que sai vai para cliente, cartório e
-- fiscalização. Isso pede o nível mais alto do módulo, que é `DELETE`.
--
-- Arquivar não pede o nível alto: tirar de circulação um modelo com defeito é
-- exatamente o que se quer que aconteça depressa. Quem pode editar pode
-- arquivar; ninguém perde nada, porque arquivado não some.

begin;

drop policy if exists document_templates_insert on public.document_templates;
drop policy if exists document_templates_update on public.document_templates;

create policy document_templates_insert on public.document_templates
for insert to authenticated
with check (
  public.has_module_permission(organization_id, module_key, 'EDIT', null, null)
  and (
    status <> 'PUBLISHED'
    or public.has_module_permission(organization_id, module_key, 'DELETE', null, null)
  )
);

create policy document_templates_update on public.document_templates
for update to authenticated
using (public.has_module_permission(organization_id, module_key, 'EDIT', null, null))
with check (
  public.has_module_permission(organization_id, module_key, 'EDIT', null, null)
  and (
    status <> 'PUBLISHED'
    or public.has_module_permission(organization_id, module_key, 'DELETE', null, null)
  )
);

comment on column public.document_templates.status is
  'DRAFT é do autor e exige EDIT no módulo. PUBLISHED vale para a organização e exige DELETE, o nível mais alto do módulo. ARCHIVED tira de circulação sem apagar, e exige apenas EDIT.';

commit;
