-- Documento emitido guarda o texto resolvido — T-32.2.7.
--
-- A diretriz de reúso listou este imprevisto desde o desenho: *"modelo alterado
-- depois de documento emitido → documento guarda o texto resolvido, não a
-- referência ao molde. Contrato não pode mudar porque alguém editou o modelo"*.
--
-- Guardar a referência seria mais barato e está errado: o contrato que o
-- cliente assinou em março tem de continuar sendo o de março, mesmo que o
-- modelo tenha mudado três vezes desde então. `template_id` fica só como
-- procedência, e vira nulo se o modelo for excluído — `template_name` preserva
-- o nome, e o documento continua íntegro.
--
-- **Sem UPDATE e sem DELETE.** Documento emitido é registro do que saiu;
-- editá-lo depois destruiria a única coisa que ele serve para provar. Corrigir
-- um documento é emitir outro.

begin;

create table if not exists public.emitted_documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  template_id       uuid references public.document_templates(id) on delete set null,
  template_version  integer,
  template_name     text not null,
  document_type     text not null references public.document_types(key),
  title             text not null,
  resolved_markdown text not null,
  variables_used    jsonb not null default '{}'::jsonb,
  gaps              jsonb not null default '[]'::jsonb,
  client_id         uuid references public.clients(id) on delete set null,
  project_id        uuid references public.projects(id) on delete set null,
  budget_id         uuid references public.budgets(id) on delete set null,
  proposal_id       uuid references public.proposals(id) on delete set null,
  sha256            text not null,
  emitted_by        uuid,
  emitted_at        timestamptz not null default now()
);

comment on table public.emitted_documents is
  'Documento gerado a partir de um modelo. Guarda o TEXTO RESOLVIDO, não a referência ao molde: contrato não muda porque alguém editou o modelo depois.';
comment on column public.emitted_documents.resolved_markdown is
  'O texto como saiu, com as variáveis já substituídas. É o que vale para auditoria.';
comment on column public.emitted_documents.template_id is
  'Apenas procedência. Vira nulo se o modelo for excluído, e `template_name` preserva o nome — o documento continua íntegro.';
comment on column public.emitted_documents.gaps is
  'Lacunas no instante da emissão. Guardadas porque um documento com buraco é evidência de processo, não erro a ser esquecido.';

create index if not exists emitted_documents_org_idx on public.emitted_documents (organization_id, emitted_at desc);
create index if not exists emitted_documents_cliente_idx on public.emitted_documents (client_id) where client_id is not null;
create index if not exists emitted_documents_obra_idx on public.emitted_documents (project_id) where project_id is not null;
create index if not exists emitted_documents_modelo_idx on public.emitted_documents (template_id) where template_id is not null;

alter table public.emitted_documents enable row level security;
alter table public.emitted_documents force row level security;

drop policy if exists emitted_documents_read on public.emitted_documents;
create policy emitted_documents_read on public.emitted_documents
for select to authenticated
using (public.has_module_permission(organization_id, 'modelos', 'READ', null, null));

drop policy if exists emitted_documents_insert on public.emitted_documents;
create policy emitted_documents_insert on public.emitted_documents
for insert to authenticated
with check (public.has_module_permission(organization_id, 'modelos', 'READ', null, null));

commit;
