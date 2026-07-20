-- Etapa 13 — índices de apoio às FKs e privilégio mínimo.

create index if not exists quality_documents_client_id_idx
  on public.quality_documents(client_id)
  where client_id is not null;

create index if not exists quality_form_answers_organization_id_idx
  on public.quality_form_answers(organization_id);

create index if not exists quality_form_assignments_assignee_user_id_idx
  on public.quality_form_assignments(assignee_user_id)
  where assignee_user_id is not null;

create index if not exists quality_form_events_response_id_idx
  on public.quality_form_events(response_id)
  where response_id is not null;

create index if not exists quality_form_events_assignment_id_idx
  on public.quality_form_events(assignment_id)
  where assignment_id is not null;

create index if not exists quality_form_events_template_id_idx
  on public.quality_form_events(template_id)
  where template_id is not null;

create index if not exists quality_form_responses_client_id_idx
  on public.quality_form_responses(client_id)
  where client_id is not null;

create index if not exists quality_form_responses_project_id_idx
  on public.quality_form_responses(project_id)
  where project_id is not null;

create index if not exists quality_form_versions_organization_id_idx
  on public.quality_form_versions(organization_id);

create index if not exists quality_public_links_assignment_id_idx
  on public.quality_public_links(assignment_id);

create index if not exists quality_public_links_organization_id_idx
  on public.quality_public_links(organization_id);

-- Todos os envios públicos, de cliente e internos passam por uma ação de servidor
-- com Service Role. A função não precisa ser invocável diretamente pelo navegador.
revoke execute on function public.mark_quality_response_submitted(uuid,numeric,text)
  from authenticated;
grant execute on function public.mark_quality_response_submitted(uuid,numeric,text)
  to service_role;
