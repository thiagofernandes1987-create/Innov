-- Pipeline — trilhas de cliente, de projeto e de assistência.
-- Sprint S-23 do inventário de execução. Contrato em diretrizes/PADRAO-DE-INTERFACE.md.
--
-- Decomposição (regra de método): o pedido "kanban e lista para cliente,
-- projeto e assistência, com prazos, marcadores e observações" não é um
-- problema. São seis:
--
--   1. onde o registro está           -> pipelines + pipeline_stages
--   2. que registro está ali          -> pipeline_cards (aponta, não copia)
--   3. quando cada coisa deve ocorrer -> pipeline_card_dates (dois eixos)
--   4. que datas cada etapa espera    -> pipeline_stage_date_codes
--   5. como marcar e anotar           -> pipeline_tags, pipeline_card_notes
--   6. quanto tempo ficou onde        -> pipeline_card_stage_history
--
-- As etapas que o responsável listou (medição, projeto executivo, fabricação…
-- / abertura de chamados, vistoria, assistência…) NÃO estão no esquema. Elas
-- são dados, semeados como preset na migration seguinte. Etapa em CHECK
-- constraint é etapa que exige migration para ser renomeada, e uma plataforma
-- que atende vários segmentos não pode pedir migration para mudar o nome de
-- uma coluna do kanban.

-- ── Código de data: o eixo, não a sigla ─────────────────────────────────────
-- Espelha lib/pipeline/datas.ts. Divergência entre os dois é reprovada por
-- scripts/validate-pipeline.mjs — sigla que só existe de um lado é sigla que
-- a interface mostra e o banco não sabe filtrar.

create or replace function public.pipeline_codigo_data(p_natureza text, p_marco text)
returns text
language sql
immutable
parallel safe
as $$
  select case p_natureza || ':' || p_marco
    when 'limite:assistencia'    then 'DLA'
    when 'limite:entrega'        then 'DLE'
    when 'prevista:inicio'       then 'DPI'
    when 'prevista:termino'      then 'DPT'
    when 'prevista:entrega'      then 'DPE'
    when 'prevista:agendamento'  then 'DPA'
    when 'efetiva:inicio'        then 'DEI'
    when 'efetiva:termino'       then 'DET'
    when 'efetiva:entrega'       then 'DEE'
    when 'efetiva:agendamento'   then 'DEA'
    else null
  end;
$$;

comment on function public.pipeline_codigo_data(text, text) is
  'Sigla da combinação natureza × marco, ou null quando a combinação não tem sigla declarada.';

-- ── Configuração da trilha ──────────────────────────────────────────────────

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  -- Que tipo de registro percorre esta trilha. Decide qual coluna do cartão é
  -- obrigatória, verificado por CHECK lá embaixo.
  trilha text not null check (trilha in ('cliente','projeto','assistencia')),
  -- Aplicativo do qual a trilha herda permissão. Sem árvore paralela de perfis.
  module_key text not null references public.app_modules(key) on update cascade,
  descricao text,
  ativo boolean not null default true,
  padrao boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key),
  -- Chaves compostas: existem para que o cartão herde organização e trilha por
  -- integridade referencial, não por disciplina da aplicação.
  unique (id, organization_id, trilha),
  unique (id, organization_id)
);

-- Uma trilha padrão por tipo, por organização. Índice parcial em vez de
-- trigger: a exclusividade fica no lugar onde o banco a garante sozinho.
create unique index if not exists pipelines_padrao_unico_idx
  on public.pipelines(organization_id, trilha) where padrao;

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  posicao integer not null,
  -- 'aberto' segue no fluxo; 'ganho' e 'perdido' encerram. A distinção existe
  -- para o indicador de conversão não contar coluna final como etapa em curso.
  categoria text not null default 'aberto' check (categoria in ('aberto','ganho','perdido')),
  -- Coluna recolhida no kanban, como o `fold` do Odoo: etapa final ocupa
  -- largura de uma faixa, não de uma coluna inteira.
  recolhida boolean not null default false,
  cor smallint not null default 0 check (cor between 0 and 11),
  -- Prazo de permanência na etapa, em dias. Null é ausência declarada de
  -- prazo, não zero: o responsável define, o esquema não inventa.
  prazo_dias integer check (prazo_dias is null or prazo_dias > 0),
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, key),
  unique (id, pipeline_id),
  unique (id, organization_id),
  foreign key (pipeline_id, organization_id)
    references public.pipelines(id, organization_id) on delete cascade
);

create index if not exists pipeline_stages_ordem_idx
  on public.pipeline_stages(pipeline_id, posicao);

-- Que datas cada etapa espera. É o que transforma "tudo tem que ter prazos e
-- datas" em regra verificável: o formulário da etapa mostra estes campos, e o
-- Gantt lê prevista/efetiva de início e término daqui.
create table if not exists public.pipeline_stage_date_codes (
  stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  natureza text not null check (natureza in ('limite','prevista','efetiva')),
  marco text not null check (marco in ('inicio','termino','entrega','agendamento','assistencia')),
  obrigatoria boolean not null default false,
  primary key (stage_id, natureza, marco),
  foreign key (stage_id, organization_id)
    references public.pipeline_stages(id, organization_id) on delete cascade,
  constraint pipeline_stage_date_codes_combinacao_declarada
    check (public.pipeline_codigo_data(natureza, marco) is not null)
);

-- ── O cartão ────────────────────────────────────────────────────────────────
-- Aponta para o registro; não o copia. Kanban que duplica dado de cliente é
-- kanban que envelhece: o cadastro muda e o cartão continua mostrando o
-- telefone antigo.

create table if not exists public.pipeline_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null,
  stage_id uuid not null,
  -- Repetida do pipeline para que o CHECK abaixo consiga ler. A FK composta
  -- impede que ela divirja.
  trilha text not null check (trilha in ('cliente','projeto','assistencia')),

  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  ticket_id uuid references public.sac_tickets(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,

  titulo text not null check (length(btrim(titulo)) > 0),
  descricao text,
  responsavel_id uuid references auth.users(id) on delete set null,
  -- Estrelas do cartão, na escala do padrão de mercado: 0 a 3.
  prioridade smallint not null default 0 check (prioridade between 0 and 3),
  valor numeric(14,2) check (valor is null or valor >= 0),
  cor smallint not null default 0 check (cor between 0 and 11),
  -- Índice fracionário: mover cartão entre dois vizinhos não renumera a coluna.
  posicao numeric not null default 0,
  arquivado_em timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id, organization_id),

  foreign key (pipeline_id, organization_id, trilha)
    references public.pipelines(id, organization_id, trilha) on delete cascade,
  foreign key (stage_id, pipeline_id)
    references public.pipeline_stages(id, pipeline_id) on delete restrict,

  -- Cada trilha exige o seu registro. Sem isto, um cartão de assistência sem
  -- chamado é um cartão que não abre nada quando alguém clica.
  constraint pipeline_cards_origem_coerente check (
    case trilha
      when 'cliente' then client_id is not null
      when 'projeto' then project_id is not null
      when 'assistencia' then ticket_id is not null
    end
  )
);

create index if not exists pipeline_cards_coluna_idx
  on public.pipeline_cards(pipeline_id, stage_id, posicao)
  where arquivado_em is null;
create index if not exists pipeline_cards_org_idx
  on public.pipeline_cards(organization_id, pipeline_id)
  where arquivado_em is null;
create index if not exists pipeline_cards_client_idx
  on public.pipeline_cards(client_id) where client_id is not null;
create index if not exists pipeline_cards_project_idx
  on public.pipeline_cards(project_id) where project_id is not null;
create index if not exists pipeline_cards_ticket_idx
  on public.pipeline_cards(ticket_id) where ticket_id is not null;
create index if not exists pipeline_cards_responsavel_idx
  on public.pipeline_cards(responsavel_id) where arquivado_em is null;

-- ── Datas ───────────────────────────────────────────────────────────────────
-- Uma linha por combinação. Dez colunas fixas dariam o mesmo resultado hoje e
-- exigiriam migration na primeira data nova; a sigla é derivada, não digitada.

create table if not exists public.pipeline_card_dates (
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  natureza text not null check (natureza in ('limite','prevista','efetiva')),
  marco text not null check (marco in ('inicio','termino','entrega','agendamento','assistencia')),
  codigo text generated always as (public.pipeline_codigo_data(natureza, marco)) stored,
  data date not null,
  observacao text,
  definido_por uuid references auth.users(id) on delete set null,
  definido_em timestamptz not null default now(),
  primary key (card_id, natureza, marco),
  foreign key (card_id, organization_id)
    references public.pipeline_cards(id, organization_id) on delete cascade,
  constraint pipeline_card_dates_combinacao_declarada
    check (public.pipeline_codigo_data(natureza, marco) is not null)
);

create index if not exists pipeline_card_dates_prazo_idx
  on public.pipeline_card_dates(organization_id, natureza, data);
create index if not exists pipeline_card_dates_codigo_idx
  on public.pipeline_card_dates(card_id, codigo);

-- ── Marcadores ──────────────────────────────────────────────────────────────

create table if not exists public.pipeline_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  cor smallint not null default 0 check (cor between 0 and 11),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

-- Marcador diferindo só por caixa vira dois marcadores na tela e um filtro que
-- perde metade dos cartões.
create unique index if not exists pipeline_tags_nome_unico_idx
  on public.pipeline_tags(organization_id, lower(btrim(nome)));

create table if not exists public.pipeline_card_tags (
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  tag_id uuid not null references public.pipeline_tags(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (card_id, tag_id),
  foreign key (card_id, organization_id)
    references public.pipeline_cards(id, organization_id) on delete cascade,
  foreign key (tag_id, organization_id)
    references public.pipeline_tags(id, organization_id) on delete cascade
);

create index if not exists pipeline_card_tags_tag_idx
  on public.pipeline_card_tags(tag_id);

-- ── Observações ─────────────────────────────────────────────────────────────

create table if not exists public.pipeline_card_notes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- 'nota' é interna; 'mensagem' foi enviada ao cliente. Misturar as duas em um
  -- campo só é como se perde a distinção entre o que o cliente leu e o que não.
  tipo text not null default 'nota' check (tipo in ('nota','mensagem')),
  corpo text not null check (length(btrim(corpo)) > 0),
  autor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  editado_em timestamptz,
  foreign key (card_id, organization_id)
    references public.pipeline_cards(id, organization_id) on delete cascade
);

create index if not exists pipeline_card_notes_card_idx
  on public.pipeline_card_notes(card_id, created_at desc);

-- ── Histórico de etapa ──────────────────────────────────────────────────────
-- Escrito só por gatilho. É o que responde "há quanto tempo está parado aqui",
-- que o padrão de mercado mostra na própria barra de etapas.

create table if not exists public.pipeline_card_stage_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  de_stage_id uuid references public.pipeline_stages(id) on delete set null,
  para_stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  motivo text,
  movido_por uuid references auth.users(id) on delete set null,
  movido_em timestamptz not null default now()
);

create index if not exists pipeline_card_stage_history_card_idx
  on public.pipeline_card_stage_history(card_id, movido_em desc);

create or replace function public.pipeline_cards_registrar_etapa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pipeline_card_stage_history
      (card_id, organization_id, de_stage_id, para_stage_id, movido_por)
    values (new.id, new.organization_id, null, new.stage_id, auth.uid());
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    insert into public.pipeline_card_stage_history
      (card_id, organization_id, de_stage_id, para_stage_id, movido_por)
    values (new.id, new.organization_id, old.stage_id, new.stage_id, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pipeline_cards_historico_insert on public.pipeline_cards;
create trigger pipeline_cards_historico_insert
  after insert on public.pipeline_cards
  for each row execute function public.pipeline_cards_registrar_etapa();

drop trigger if exists pipeline_cards_historico_update on public.pipeline_cards;
create trigger pipeline_cards_historico_update
  before update on public.pipeline_cards
  for each row execute function public.pipeline_cards_registrar_etapa();

-- Cartão não muda de trilha nem de organização depois de criado: seria a
-- mesma linha apontando para outro registro, com o histórico de etapas de um
-- fluxo que ela não percorre mais.
create or replace function public.pipeline_cards_congelar_origem()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.trilha is distinct from old.trilha
     or new.pipeline_id is distinct from old.pipeline_id then
    raise exception 'Cartão não muda de organização, de trilha nem de pipeline. Arquive e crie outro.';
  end if;
  return new;
end;
$$;

drop trigger if exists pipeline_cards_origem_congelada on public.pipeline_cards;
create trigger pipeline_cards_origem_congelada
  before update on public.pipeline_cards
  for each row execute function public.pipeline_cards_congelar_origem();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Uma política por operação, reusando has_module_permission. O módulo vem da
-- trilha; quem enxerga o módulo enxerga a trilha, no nível do próprio perfil.

alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.pipeline_stage_date_codes enable row level security;
alter table public.pipeline_cards enable row level security;
alter table public.pipeline_card_dates enable row level security;
alter table public.pipeline_tags enable row level security;
alter table public.pipeline_card_tags enable row level security;
alter table public.pipeline_card_notes enable row level security;
alter table public.pipeline_card_stage_history enable row level security;

alter table public.pipelines force row level security;
alter table public.pipeline_stages force row level security;
alter table public.pipeline_stage_date_codes force row level security;
alter table public.pipeline_cards force row level security;
alter table public.pipeline_card_dates force row level security;
alter table public.pipeline_tags force row level security;
alter table public.pipeline_card_tags force row level security;
alter table public.pipeline_card_notes force row level security;
alter table public.pipeline_card_stage_history force row level security;

-- Permissão de uma trilha, resolvida a partir do módulo dela. Uma função em
-- vez de repetir o mesmo `exists` em treze políticas: a regra muda em um lugar.
create or replace function public.pipeline_permite(p_pipeline_id uuid, p_nivel public.app_access_level)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.pipelines p
    where p.id = p_pipeline_id
      and (
        public.has_module_permission(p.organization_id, p.module_key, p_nivel, null, null)
        or public.has_module_permission(p.organization_id, 'administracao', p_nivel, null, null)
      )
  );
$$;

create or replace function public.pipeline_permite_cartao(p_card_id uuid, p_nivel public.app_access_level)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.pipeline_cards c
    where c.id = p_card_id and public.pipeline_permite(c.pipeline_id, p_nivel)
  );
$$;

drop policy if exists pipelines_read on public.pipelines;
create policy pipelines_read on public.pipelines
for select to authenticated
using (
  public.has_module_permission(organization_id, module_key, 'READ', null, null)
  or public.has_module_permission(organization_id, 'administracao', 'READ', null, null)
);

-- Configurar trilha é ato de administração: quem opera o kanban move cartão,
-- não redesenha o funil.
drop policy if exists pipelines_write on public.pipelines;
create policy pipelines_write on public.pipelines
for all to authenticated
using (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null))
with check (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null));

drop policy if exists pipeline_stages_read on public.pipeline_stages;
create policy pipeline_stages_read on public.pipeline_stages
for select to authenticated
using (public.pipeline_permite(pipeline_id, 'READ'));

drop policy if exists pipeline_stages_write on public.pipeline_stages;
create policy pipeline_stages_write on public.pipeline_stages
for all to authenticated
using (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null))
with check (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null));

drop policy if exists pipeline_stage_date_codes_read on public.pipeline_stage_date_codes;
create policy pipeline_stage_date_codes_read on public.pipeline_stage_date_codes
for select to authenticated
using (
  exists (
    select 1 from public.pipeline_stages s
    where s.id = pipeline_stage_date_codes.stage_id
      and public.pipeline_permite(s.pipeline_id, 'READ')
  )
);

drop policy if exists pipeline_stage_date_codes_write on public.pipeline_stage_date_codes;
create policy pipeline_stage_date_codes_write on public.pipeline_stage_date_codes
for all to authenticated
using (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null))
with check (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null));

drop policy if exists pipeline_cards_read on public.pipeline_cards;
create policy pipeline_cards_read on public.pipeline_cards
for select to authenticated
using (public.pipeline_permite(pipeline_id, 'READ'));

drop policy if exists pipeline_cards_insert on public.pipeline_cards;
create policy pipeline_cards_insert on public.pipeline_cards
for insert to authenticated
with check (public.pipeline_permite(pipeline_id, 'EDIT'));

drop policy if exists pipeline_cards_update on public.pipeline_cards;
create policy pipeline_cards_update on public.pipeline_cards
for update to authenticated
using (public.pipeline_permite(pipeline_id, 'EDIT'))
with check (public.pipeline_permite(pipeline_id, 'EDIT'));

drop policy if exists pipeline_cards_delete on public.pipeline_cards;
create policy pipeline_cards_delete on public.pipeline_cards
for delete to authenticated
using (public.pipeline_permite(pipeline_id, 'DELETE'));

drop policy if exists pipeline_card_dates_read on public.pipeline_card_dates;
create policy pipeline_card_dates_read on public.pipeline_card_dates
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

drop policy if exists pipeline_card_dates_write on public.pipeline_card_dates;
create policy pipeline_card_dates_write on public.pipeline_card_dates
for all to authenticated
using (public.pipeline_permite_cartao(card_id, 'EDIT'))
with check (public.pipeline_permite_cartao(card_id, 'EDIT'));

drop policy if exists pipeline_tags_read on public.pipeline_tags;
create policy pipeline_tags_read on public.pipeline_tags
for select to authenticated
using (
  public.has_module_permission(organization_id, 'clientes', 'READ', null, null)
  or public.has_module_permission(organization_id, 'administracao', 'READ', null, null)
);

drop policy if exists pipeline_tags_write on public.pipeline_tags;
create policy pipeline_tags_write on public.pipeline_tags
for all to authenticated
using (
  public.has_module_permission(organization_id, 'clientes', 'EDIT', null, null)
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
)
with check (
  public.has_module_permission(organization_id, 'clientes', 'EDIT', null, null)
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
);

drop policy if exists pipeline_card_tags_read on public.pipeline_card_tags;
create policy pipeline_card_tags_read on public.pipeline_card_tags
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

drop policy if exists pipeline_card_tags_write on public.pipeline_card_tags;
create policy pipeline_card_tags_write on public.pipeline_card_tags
for all to authenticated
using (public.pipeline_permite_cartao(card_id, 'EDIT'))
with check (public.pipeline_permite_cartao(card_id, 'EDIT'));

drop policy if exists pipeline_card_notes_read on public.pipeline_card_notes;
create policy pipeline_card_notes_read on public.pipeline_card_notes
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

drop policy if exists pipeline_card_notes_insert on public.pipeline_card_notes;
create policy pipeline_card_notes_insert on public.pipeline_card_notes
for insert to authenticated
with check (public.pipeline_permite_cartao(card_id, 'EDIT') and autor_id = auth.uid());

-- Observação alheia não se edita nem se apaga: o registro do que foi dito é o
-- que dá valor à anotação.
drop policy if exists pipeline_card_notes_update on public.pipeline_card_notes;
create policy pipeline_card_notes_update on public.pipeline_card_notes
for update to authenticated
using (autor_id = auth.uid() and public.pipeline_permite_cartao(card_id, 'EDIT'))
with check (autor_id = auth.uid());

drop policy if exists pipeline_card_notes_delete on public.pipeline_card_notes;
create policy pipeline_card_notes_delete on public.pipeline_card_notes
for delete to authenticated
using (autor_id = auth.uid() and public.pipeline_permite_cartao(card_id, 'EDIT'));

drop policy if exists pipeline_card_stage_history_read on public.pipeline_card_stage_history;
create policy pipeline_card_stage_history_read on public.pipeline_card_stage_history
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

-- ── Privilégio mínimo ───────────────────────────────────────────────────────

revoke all on public.pipelines from anon, authenticated;
revoke all on public.pipeline_stages from anon, authenticated;
revoke all on public.pipeline_stage_date_codes from anon, authenticated;
revoke all on public.pipeline_cards from anon, authenticated;
revoke all on public.pipeline_card_dates from anon, authenticated;
revoke all on public.pipeline_tags from anon, authenticated;
revoke all on public.pipeline_card_tags from anon, authenticated;
revoke all on public.pipeline_card_notes from anon, authenticated;
revoke all on public.pipeline_card_stage_history from anon, authenticated;

grant select, insert, update, delete on public.pipelines to authenticated;
grant select, insert, update, delete on public.pipeline_stages to authenticated;
grant select, insert, update, delete on public.pipeline_stage_date_codes to authenticated;
grant select, insert, update, delete on public.pipeline_cards to authenticated;
grant select, insert, update, delete on public.pipeline_card_dates to authenticated;
grant select, insert, update, delete on public.pipeline_tags to authenticated;
grant select, insert, update, delete on public.pipeline_card_tags to authenticated;
grant select, insert, update, delete on public.pipeline_card_notes to authenticated;

-- Histórico é escrito por gatilho. Concedê-lo à aplicação seria permitir
-- reescrever o registro de quando o cartão andou.
grant select on public.pipeline_card_stage_history to authenticated;

revoke all on function public.pipeline_cards_registrar_etapa() from public, anon, authenticated;
revoke all on function public.pipeline_cards_congelar_origem() from public, anon, authenticated;

-- ── Verificação embutida ────────────────────────────────────────────────────

do $$
declare
  v_faltando text;
begin
  select string_agg(t.name, ', ')
    into v_faltando
  from (values
    ('pipelines'),
    ('pipeline_stages'),
    ('pipeline_stage_date_codes'),
    ('pipeline_cards'),
    ('pipeline_card_dates'),
    ('pipeline_tags'),
    ('pipeline_card_tags'),
    ('pipeline_card_notes'),
    ('pipeline_card_stage_history')
  ) as t(name)
  where not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t.name and c.relrowsecurity
  );
  if v_faltando is not null then
    raise exception 'Tabelas de pipeline sem RLS habilitada: %', v_faltando;
  end if;

  -- Os dez códigos declarados precisam existir; um a menos e a interface
  -- mostra um campo que o banco recusa.
  if (
    select count(distinct public.pipeline_codigo_data(n.natureza, m.marco))
    from (values ('limite'),('prevista'),('efetiva')) as n(natureza)
    cross join (values ('inicio'),('termino'),('entrega'),('agendamento'),('assistencia')) as m(marco)
    where public.pipeline_codigo_data(n.natureza, m.marco) is not null
  ) <> 10 then
    raise exception 'Catálogo de códigos de data não resolve exatamente 10 siglas.';
  end if;
end;
$$;
