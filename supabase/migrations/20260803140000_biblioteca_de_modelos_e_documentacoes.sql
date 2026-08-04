-- Modelos e Documentações: uma biblioteca só, lida por todos os aplicativos.
--
-- **Correção de rota.** A migration de 2 de agosto amarrou cada modelo ao
-- módulo que o emite, usando `module_key` como chave de permissão. O
-- responsável recusou em 3 de agosto, com o caso que derruba o desenho:
--
--   "enviar uma proposta para o cliente na etapa de projeto ou o contrato
--    assinado, não teria como se cada documento ficasse preso a um único
--    módulo"
--
-- Documento circula entre módulos por natureza. Amarrar o modelo ao emissor
-- transforma todo uso legítimo numa exceção, e exceção em regra de acesso é
-- como a permissão apodrece.
--
-- Três coisas passam a ser separadas:
--
--   ONDE MORA     uma tabela só, no aplicativo `modelos`. Todo módulo lê.
--   O QUE É       `document_type`, do catálogo `document_types`.
--   QUEM OFERECE  `document_module_types` — o check da Administração, por
--                 empresa. É **disponibilização**, não segurança: quem pode
--                 ler continua sendo quem tem READ em `modelos`.
--
-- E duas origens:
--
--   PLATAFORMA    `organization_id is null`. Vale para todas as empresas e não
--                 é editável pela aplicação — muda por migration. Empresa que
--                 quiser sua versão duplica, e a cópia é dela.
--   ORGANIZACAO   da empresa, editável pelo administrador dela.

begin;

-- 1. Catálogo de tipos --------------------------------------------------------

create table if not exists public.document_types (
  key         text primary key,
  label       text not null,
  category    text not null,
  sort_order  integer not null default 0,
  description text not null default ''
);

comment on table public.document_types is
  'Tipos de documento. Espelha lib/documentos/tipos.ts; validate:documentos reprova divergência.';

insert into public.document_types (key, label, category, sort_order, description) values
  ('PROPOSTA', 'Proposta comercial', 'COMERCIAL', 0, 'Proposta técnica e comercial enviada ao cliente.'),
  ('ORCAMENTO', 'Orçamento', 'COMERCIAL', 10, 'Planilha ou carta de orçamento.'),
  ('CARTA_APRESENTACAO', 'Carta de apresentação', 'COMERCIAL', 20, 'Apresentação da empresa e do portfólio.'),
  ('CONTRATO', 'Contrato', 'JURIDICO', 30, 'Instrumento contratual de prestação de serviço ou obra.'),
  ('ADITIVO', 'Aditivo contratual', 'JURIDICO', 40, 'Alteração de valor, prazo ou escopo do contrato.'),
  ('DISTRATO', 'Distrato', 'JURIDICO', 50, 'Encerramento consensual do contrato.'),
  ('PROCURACAO', 'Procuração', 'JURIDICO', 60, 'Outorga de poderes para representação.'),
  ('CRM_QUALIFICACAO', 'Qualificação de lead', 'CRM', 70, 'Roteiro de perguntas para qualificar quem chegou.'),
  ('CRM_GATILHO', 'Gatilho de retomada', 'CRM', 80, 'Mensagem para reativar quem parou de responder.'),
  ('CRM_BOAS_VINDAS', 'Boas-vindas', 'CRM', 90, 'Primeira mensagem depois do cadastro do lead.'),
  ('CRM_CONFIRMACAO_REUNIAO', 'Confirmação de reunião', 'CRM', 100, 'Confirmação de data, hora e participantes.'),
  ('CRM_LGPD', 'Consentimento LGPD', 'CRM', 110, 'Pedido de consentimento para tratamento de dados pessoais.'),
  ('CRM_AGRADECIMENTO', 'Agradecimento', 'CRM', 120, 'Agradecimento por visita, reunião ou indicação.'),
  ('CONTATO', 'Roteiro de contato', 'CRM', 130, 'Roteiro de ligação ou visita.'),
  ('MENSAGEM_ETAPA', 'Mensagem por etapa do funil', 'MENSAGENS', 140, 'Disparada quando o cartão muda de etapa.'),
  ('LEMBRETE', 'Lembrete', 'MENSAGENS', 150, 'Aviso de prazo, pendência ou vencimento.'),
  ('AGENDAMENTO', 'Agendamento', 'MENSAGENS', 160, 'Marcação de visita, medição ou montagem.'),
  ('EMAIL', 'E-mail', 'MENSAGENS', 170, 'Layout de e-mail transacional.'),
  ('EMAIL_MARKETING', 'E-mail marketing', 'MENSAGENS', 180, 'Campanha para base de contatos.'),
  ('COBRANCA', 'Cobrança', 'MENSAGENS', 190, 'Aviso de parcela ou medição em aberto.'),
  ('FVS', 'FVS — verificação de serviço', 'QUALIDADE', 200, 'Ficha de verificação de serviço executado.'),
  ('FVM', 'FVM — verificação de material', 'QUALIDADE', 210, 'Ficha de verificação de material recebido.'),
  ('PROCEDIMENTO', 'Procedimento operacional', 'QUALIDADE', 220, 'PO com fluxo, responsáveis e prazos.'),
  ('LAUDO', 'Laudo técnico', 'QUALIDADE', 230, 'Parecer técnico com evidências.'),
  ('NAO_CONFORMIDADE', 'Não conformidade', 'QUALIDADE', 240, 'Registro de desvio, causa e ação.'),
  ('TERMO_ABERTURA', 'Termo de abertura', 'TERMOS', 250, 'Abertura de obra, projeto ou frente de serviço.'),
  ('TERMO_CIENCIA', 'Termo de ciência', 'TERMOS', 260, 'Registro de que a parte foi informada.'),
  ('TERMO_CONSCIENTIZACAO', 'Termo de conscientização', 'TERMOS', 270, 'Conscientização de segurança, qualidade ou meio ambiente.'),
  ('TERMO_TREINAMENTO', 'Termo de treinamento', 'TERMOS', 280, 'Comprovação de treinamento com lista de presença.'),
  ('TERMO_ENCERRAMENTO', 'Termo de encerramento', 'TERMOS', 290, 'Encerramento de etapa, obra ou contrato.'),
  ('TERMO_ENTREGA', 'Termo de entrega', 'TERMOS', 300, 'Entrega de obra, chave, equipamento ou documento.'),
  ('ORDEM_SERVICO', 'Ordem de serviço', 'OPERACIONAL', 310, 'Autorização de execução com escopo e prazo.'),
  ('RELATORIO_VISITA', 'Relatório de visita', 'OPERACIONAL', 320, 'Registro do que foi observado em campo.'),
  ('ATA_REUNIAO', 'Ata de reunião', 'OPERACIONAL', 330, 'Decisões, responsáveis e prazos combinados.'),
  ('DECLARACAO', 'Declaração', 'OPERACIONAL', 340, 'Declaração avulsa assinada pela empresa.')
on conflict (key) do update
  set label = excluded.label,
      category = excluded.category,
      sort_order = excluded.sort_order,
      description = excluded.description;

alter table public.document_types enable row level security;
alter table public.document_types force row level security;

drop policy if exists document_types_read on public.document_types;
create policy document_types_read on public.document_types
for select to authenticated using (true);

-- 2. Origem do modelo ---------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_scope') then
    create type public.document_scope as enum ('PLATAFORMA', 'ORGANIZACAO');
  end if;
end $$;

-- 3. `document_templates` deixa de ser preso ao módulo -------------------------

-- As políticas antigas leem `module_key`; enquanto existirem, a coluna não sai.
drop policy if exists document_templates_read on public.document_templates;
drop policy if exists document_templates_insert on public.document_templates;
drop policy if exists document_templates_update on public.document_templates;
drop policy if exists document_templates_delete on public.document_templates;

alter table public.document_templates
  add column if not exists scope public.document_scope not null default 'ORGANIZACAO',
  add column if not exists document_type text,
  add column if not exists client_visible boolean not null default false,
  add column if not exists derived_from uuid references public.document_templates(id) on delete set null;

-- `purpose` era o tipo com outro nome. Migra o conteúdo antes de trocar.
update public.document_templates
   set document_type = case
         when purpose = 'ORCAMENTO_ENVIO' then 'ORCAMENTO'
         when purpose = 'MENSAGEM' then 'MENSAGEM_ETAPA'
         when purpose in (select key from public.document_types) then purpose
         else 'DECLARACAO'
       end
 where document_type is null;

alter table public.document_templates
  alter column document_type set not null,
  alter column organization_id drop not null;

alter table public.document_templates
  drop constraint if exists document_templates_document_type_fkey;
alter table public.document_templates
  add constraint document_templates_document_type_fkey
  foreign key (document_type) references public.document_types(key);

-- Plataforma não tem organização; organização sempre tem. Sem isso, um modelo
-- da empresa gravado sem `organization_id` viraria biblioteca global sem que
-- ninguém pedisse.
alter table public.document_templates
  drop constraint if exists document_templates_origem_coerente;
alter table public.document_templates
  add constraint document_templates_origem_coerente check (
    (scope = 'PLATAFORMA' and organization_id is null)
    or (scope = 'ORGANIZACAO' and organization_id is not null)
  );

-- `module_key` deixa de decidir permissão. A coluna sai: mantê-la sem uso é
-- convite para alguém voltar a filtrar por ela.
alter table public.document_templates drop column if exists module_key;
alter table public.document_templates drop column if exists purpose;

drop index if exists document_templates_nome_unico_idx;
create unique index document_templates_nome_unico_idx
  on public.document_templates (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), document_type, lower(name))
  where archived_at is null;

create index if not exists document_templates_tipo_idx
  on public.document_templates (document_type) where archived_at is null;

-- 4. Quais tipos cada aplicativo oferece --------------------------------------

create table if not exists public.document_module_types (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key      text not null,
  document_type   text not null references public.document_types(key) on delete cascade,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  primary key (organization_id, module_key, document_type)
);

comment on table public.document_module_types is
  'Marcação da Administração: quais tipos de documento cada aplicativo oferece, por empresa. Disponibilização, não segurança.';

alter table public.document_module_types enable row level security;
alter table public.document_module_types force row level security;

drop policy if exists document_module_types_read on public.document_module_types;
create policy document_module_types_read on public.document_module_types
for select to authenticated
using (public.has_module_permission(organization_id, 'modelos', 'READ', null, null));

drop policy if exists document_module_types_write on public.document_module_types;
create policy document_module_types_write on public.document_module_types
for all to authenticated
using (public.has_module_permission(organization_id, 'administracao', 'DELETE', null, null))
with check (public.has_module_permission(organization_id, 'administracao', 'DELETE', null, null));

-- 5. Políticas do acervo ------------------------------------------------------

-- Ler: a biblioteca da plataforma é de todos; a da empresa é de quem tem
-- acesso ao aplicativo de modelos. **Todo módulo lê o mesmo acervo** — é o que
-- permite enviar a proposta de dentro de Projetos.
create policy document_templates_read on public.document_templates
for select to authenticated
using (
  scope = 'PLATAFORMA'
  or public.has_module_permission(organization_id, 'modelos', 'READ', null, null)
);

-- Escrever: só o acervo da própria empresa. A biblioteca da plataforma muda por
-- migration, nunca pela aplicação: um administrador de uma empresa não pode
-- alterar o padrão que vale para as outras.
create policy document_templates_insert on public.document_templates
for insert to authenticated
with check (
  scope = 'ORGANIZACAO'
  and public.has_module_permission(organization_id, 'modelos', 'EDIT', null, null)
  and (
    status <> 'PUBLISHED'
    or public.has_module_permission(organization_id, 'modelos', 'DELETE', null, null)
  )
);

create policy document_templates_update on public.document_templates
for update to authenticated
using (
  scope = 'ORGANIZACAO'
  and public.has_module_permission(organization_id, 'modelos', 'EDIT', null, null)
)
with check (
  scope = 'ORGANIZACAO'
  and public.has_module_permission(organization_id, 'modelos', 'EDIT', null, null)
  and (
    status <> 'PUBLISHED'
    or public.has_module_permission(organization_id, 'modelos', 'DELETE', null, null)
  )
);

create policy document_templates_delete on public.document_templates
for delete to authenticated
using (
  scope = 'ORGANIZACAO'
  and public.has_module_permission(organization_id, 'modelos', 'DELETE', null, null)
  and published_at is null
);

comment on column public.document_templates.scope is
  'PLATAFORMA vale para todas as empresas e muda por migration. ORGANIZACAO é da empresa e o administrador dela edita.';
comment on column public.document_templates.client_visible is
  'Marca o modelo que pode ser enviado ao cliente. É o corte que a Administração usa para liberar "só o que é do cliente".';
comment on column public.document_templates.derived_from is
  'Modelo da plataforma de que este é cópia. Guardado para saber o que a empresa mudou em relação ao padrão.';

commit;
