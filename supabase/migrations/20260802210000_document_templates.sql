-- Modelos de documento — um motor, sete módulos.
--
-- Pedido do responsável em 2 de agosto:
--
--   "Salvar os modelos em uma tabela com informações de módulo e função para na
--   hora que carregar o app ele filtra o que é dele, assim sempre teremos tudo
--   protegido por RLS"
--
-- É exatamente o desenho certo, e o motivo é mais forte que a conveniência de
-- filtrar: **o módulo é a chave de permissão**. Guardar `module_key` na linha
-- faz a RLS reaproveitar `has_module_permission`, que já é o mecanismo de toda
-- a plataforma. Sem essa coluna, ou se criaria uma segunda regra de acesso só
-- para modelos — duas regras que divergem no primeiro ajuste — ou modelo de
-- contrato apareceria para quem só tem qualidade.
--
-- `purpose` é a função dentro do módulo: qualidade tem FVS e FVM, que são
-- modelos diferentes do mesmo aplicativo. Módulo sozinho não separa.

begin;

create type public.document_template_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- A dupla que responde "de quem é este modelo".
  module_key text not null,
  purpose text not null,

  name text not null,
  description text,

  -- O corpo é Markdown. Decisão registrada em diretrizes/REUSO-DE-INFORMACAO.md:
  -- versiona em diff legível, converte para PDF, DOCX e HTML de e-mail, e
  -- sobrevive à plataforma. O editor é visual; o que grava é isto.
  body_markdown text not null default '',

  -- Variáveis citadas no corpo, extraídas na gravação. Coluna derivada, mantida
  -- para a busca "quais modelos usam {{cliente.documento}}?" não precisar ler o
  -- corpo de todos.
  variables text[] not null default '{}',

  status public.document_template_status not null default 'DRAFT',
  version_number integer not null default 1,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_templates_module_nao_vazio check (length(trim(module_key)) > 0),
  constraint document_templates_purpose_nao_vazio check (length(trim(purpose)) > 0),
  constraint document_templates_nome_nao_vazio check (length(trim(name)) > 0),
  -- Publicado exige corpo. Modelo publicado em branco geraria documento em
  -- branco, e o erro só apareceria na frente do cliente.
  constraint document_templates_publicado_tem_corpo
    check (status <> 'PUBLISHED' or length(trim(body_markdown)) > 0)
);

-- O índice espelha a consulta que o aplicativo faz ao carregar: "meus modelos
-- publicados, deste módulo, desta função".
create index document_templates_escopo_idx
  on public.document_templates(organization_id, module_key, purpose, status);

create unique index document_templates_nome_unico_idx
  on public.document_templates(organization_id, module_key, purpose, lower(name))
  where archived_at is null;

alter table public.document_templates enable row level security;
alter table public.document_templates force row level security;

-- Leitura: quem lê o módulo lê os modelos dele. É a mesma régua do resto da
-- plataforma, e é o que o responsável pediu ao guardar o módulo na linha.
create policy document_templates_read on public.document_templates
for select to authenticated
using (public.has_module_permission(organization_id, module_key, 'READ', null, null));

create policy document_templates_insert on public.document_templates
for insert to authenticated
with check (public.has_module_permission(organization_id, module_key, 'EDIT', null, null));

create policy document_templates_update on public.document_templates
for update to authenticated
using (public.has_module_permission(organization_id, module_key, 'EDIT', null, null))
with check (public.has_module_permission(organization_id, module_key, 'EDIT', null, null));

-- Excluir exige o nível mais alto **e** modelo nunca publicado. Modelo que já
-- gerou documento vira ARCHIVED, nunca some: o documento emitido guarda o texto
-- resolvido, mas a auditoria precisa poder chegar no molde que o originou.
create policy document_templates_delete on public.document_templates
for delete to authenticated
using (
  public.has_module_permission(organization_id, module_key, 'DELETE', null, null)
  and published_at is null
);

comment on table public.document_templates is
  'Modelos de documento em Markdown com variáveis, por módulo e função. RLS pela permissão do módulo.';
comment on column public.document_templates.module_key is
  'Módulo dono. É a chave de permissão da RLS, não apenas um filtro de tela.';
comment on column public.document_templates.purpose is
  'Função dentro do módulo: PROPOSTA, ORCAMENTO_ENVIO, CONTRATO, ADITIVO, FVS, FVM, MENSAGEM, EMAIL, LAUDO.';

commit;
