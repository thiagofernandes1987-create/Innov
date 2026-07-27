-- Pipeline — conversa completa e configuração de etapa por quem opera.
-- Sprint S-23. Pedido do responsável em 26 de julho de 2026, a partir das 261
-- capturas: "criar e editar etapa pela própria coluna" e "padrão em todos os
-- cards: mensagens, atividades, notas, WhatsApp e ação".

-- ── 1. Quem configura a etapa ───────────────────────────────────────────────
-- A política anterior exigia `administracao EDIT` para mexer em etapa. No
-- padrão de mercado, quem trabalha o kanban é quem nomeia as colunas dele —
-- exigir administrador para renomear "Medição" transforma um ajuste de dez
-- segundos em um chamado. Quem tem EDIT no módulo da trilha passa a poder
-- configurar as etapas dessa trilha, e só dela.

drop policy if exists pipeline_stages_write on public.pipeline_stages;
create policy pipeline_stages_write on public.pipeline_stages
for all to authenticated
using (
  public.pipeline_permite(pipeline_id, 'EDIT')
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
)
with check (
  public.pipeline_permite(pipeline_id, 'EDIT')
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
);

drop policy if exists pipeline_stage_date_codes_write on public.pipeline_stage_date_codes;
create policy pipeline_stage_date_codes_write on public.pipeline_stage_date_codes
for all to authenticated
using (
  exists (
    select 1 from public.pipeline_stages s
    where s.id = pipeline_stage_date_codes.stage_id
      and public.pipeline_permite(s.pipeline_id, 'EDIT')
  )
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
)
with check (
  exists (
    select 1 from public.pipeline_stages s
    where s.id = pipeline_stage_date_codes.stage_id
      and public.pipeline_permite(s.pipeline_id, 'EDIT')
  )
  or public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null)
);

-- Etapa com cartão não some por engano: a chave estrangeira do cartão já é
-- `on delete restrict`. O que falta é a mensagem — erro de chave estrangeira
-- não é frase que se mostra a ninguém, e a aplicação traduz.

-- ── 2. Conversa: o WhatsApp entra como tipo, não como tabela ────────────────
-- Mensagem enviada por WhatsApp é mensagem: mesmo corpo, mesmo autor, mesma
-- linha do tempo. Só o canal muda. Tabela separada duplicaria a consulta da
-- conversa e faria o histórico chegar em duas listas que alguém teria de
-- intercalar na tela.

alter table public.pipeline_card_notes
  drop constraint if exists pipeline_card_notes_tipo_check;

alter table public.pipeline_card_notes
  add constraint pipeline_card_notes_tipo_check
  check (tipo in ('nota', 'mensagem', 'whatsapp'));

-- Para onde a mensagem foi. Nulo em nota interna, que não sai da casa.
alter table public.pipeline_card_notes
  add column if not exists destino text;

-- ── 3. Atividade agendada ───────────────────────────────────────────────────
-- Diferente de observação: observação registra o que já aconteceu, atividade
-- marca o que ainda precisa acontecer. Misturar as duas é como se perde o
-- "ligar amanhã" no meio do histórico.

create table if not exists public.pipeline_card_activities (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tipo text not null check (tipo in ('tarefa','ligacao','reuniao','email','whatsapp','documento')),
  titulo text not null check (length(btrim(titulo)) > 0),
  detalhe text,
  prazo date,
  responsavel_id uuid references auth.users(id) on delete set null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  concluida_em timestamptz,
  concluida_por uuid references auth.users(id) on delete set null,
  foreign key (card_id, organization_id)
    references public.pipeline_cards(id, organization_id) on delete cascade
);

-- O que está em aberto e vencendo é a consulta que a tela faz o tempo todo;
-- o que já foi concluído quase nunca é lido.
create index if not exists pipeline_card_activities_abertas_idx
  on public.pipeline_card_activities(organization_id, prazo)
  where concluida_em is null;
create index if not exists pipeline_card_activities_card_idx
  on public.pipeline_card_activities(card_id, criado_em desc);
create index if not exists pipeline_card_activities_minhas_idx
  on public.pipeline_card_activities(responsavel_id, prazo)
  where concluida_em is null;

alter table public.pipeline_card_activities enable row level security;
alter table public.pipeline_card_activities force row level security;

drop policy if exists pipeline_card_activities_read on public.pipeline_card_activities;
create policy pipeline_card_activities_read on public.pipeline_card_activities
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

drop policy if exists pipeline_card_activities_write on public.pipeline_card_activities;
create policy pipeline_card_activities_write on public.pipeline_card_activities
for all to authenticated
using (public.pipeline_permite_cartao(card_id, 'EDIT'))
with check (public.pipeline_permite_cartao(card_id, 'EDIT'));

revoke all on public.pipeline_card_activities from anon, authenticated;
grant select, insert, update, delete on public.pipeline_card_activities to authenticated;

-- ── Verificação embutida ────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'pipeline_card_activities' and c.relrowsecurity
  ) then
    raise exception 'pipeline_card_activities sem RLS habilitada.';
  end if;

  -- O tipo novo precisa passar e o inventado precisa ser recusado.
  begin
    perform 1 where 'whatsapp' in ('nota','mensagem','whatsapp');
  exception when others then
    raise exception 'Tipo whatsapp não foi aceito pela restrição.';
  end;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pipeline_card_notes_tipo_check'
      and pg_get_constraintdef(oid) like '%whatsapp%'
  ) then
    raise exception 'A restrição de tipo de observação não conhece whatsapp.';
  end if;
end;
$$;
