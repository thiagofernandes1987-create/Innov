-- Listas cadastradas por escopo — motivos de perda primeiro.
--
-- Pedido do responsável, com as palavras dele: *"quando for para perdido
-- precisa abrir um formulário com os motivos da perca do lead, tipo parou de
-- responder, praça errada, Produto errado, etc… esses itens tem que ser
-- possível cadastrar no menu"*.
--
-- **Isto é diferente do catálogo de valores usados.** São duas coisas que
-- parecem uma:
--
--   - `value_catalog` é **observado**: nasce do uso, ninguém cadastra, e serve
--     para lembrar a grafia que a empresa já escolheu.
--   - `managed_list_values` é **curado**: alguém decidiu quais opções existem,
--     em que ordem aparecem e quais saíram de circulação.
--
-- Motivo de perda é curado por natureza. Ele alimenta contagem — "quantos
-- perdemos por preço neste trimestre" — e contagem sobre texto que cada pessoa
-- escreve do seu jeito não fecha. Foi por isso que a caixa livre não servia
-- aqui, e é por isso que a lista cadastrada serve.
--
-- **Por escopo, e não uma tabela de motivos.** O repositório já nomeia escopos
-- (`funil.etapa`, `cartao.marcador`, `medida.unidade`), e marcador de cartão e
-- etapa de funil vão pedir exatamente esta tela. Três tabelas quase iguais é
-- três vezes a mesma correção.

begin;

create table if not exists public.managed_list_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope           text not null,
  label           text not null,
  normalized      text not null,
  position        integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  constraint managed_list_values_label_nao_vazio check (length(trim(label)) > 0),
  constraint managed_list_values_normalizado_nao_vazio check (length(trim(normalized)) > 0),
  constraint managed_list_values_unico unique (organization_id, scope, normalized)
);

comment on table public.managed_list_values is
  'Listas curadas por escopo — o que a empresa decidiu que existe como opção. Diferente de value_catalog, que é observado do uso.';
comment on column public.managed_list_values.active is
  'Item fora de circulação continua na tabela. Excluir apagaria a opção de registros históricos que a escolheram, e a contagem do trimestre passado mudaria sozinha.';
comment on column public.managed_list_values.position is
  'Ordem de exibição. A lista é curada, então a ordem é decisão de quem curou — não alfabética.';

create index if not exists managed_list_values_escopo_idx
  on public.managed_list_values (organization_id, scope, active, position);

alter table public.managed_list_values enable row level security;
alter table public.managed_list_values force row level security;

-- Ler é de quem participa da organização: a lista aparece no formulário de
-- quem trabalha o funil, não só de quem administra.
drop policy if exists managed_list_values_read on public.managed_list_values;
create policy managed_list_values_read on public.managed_list_values
for select to authenticated
using (public.is_org_member(organization_id));

-- Escrever é de administração. A lista é da empresa inteira: se cada pessoa
-- pudesse acrescentar, ela viraria o texto livre que esta tabela substitui.
drop policy if exists managed_list_values_write on public.managed_list_values;
create policy managed_list_values_write on public.managed_list_values
for all to authenticated
using (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null))
with check (public.has_module_permission(organization_id, 'administracao', 'EDIT', null, null));

/* ------------------------------------------------------------------ */
/* Semeadura                                                           */
/* ------------------------------------------------------------------ */

-- Os motivos que o responsável nomeou, mais os que aparecem em toda operação
-- comercial. É ponto de partida: a empresa edita, reordena e desativa.
create or replace function public.semear_motivos_de_perda(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inseridos integer;
begin
  insert into public.managed_list_values (organization_id, scope, label, normalized, position)
  select p_organization_id, 'negocio.motivo_perda', item.label, item.normalized, item.pos
  from (values
    ('Parou de responder', 'parou de responder', 10),
    ('Praça errada',       'praca errada',       20),
    ('Produto errado',     'produto errado',     30),
    ('Preço acima do orçamento do cliente', 'preco acima do orcamento do cliente', 40),
    ('Prazo incompatível', 'prazo incompativel', 50),
    ('Perdeu para concorrente', 'perdeu para concorrente', 60),
    ('Cliente adiou a obra', 'cliente adiou a obra', 70),
    ('Sem verba aprovada', 'sem verba aprovada', 80),
    ('Escopo fora do que atendemos', 'escopo fora do que atendemos', 90)
  ) as item(label, normalized, pos)
  on conflict (organization_id, scope, normalized) do nothing;
  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end;
$$;

comment on function public.semear_motivos_de_perda(uuid) is
  'Ponto de partida dos motivos de perda da empresa. Idempotente: só traz o que ainda não existe, e nunca reescreve o que a empresa editou.';

revoke all on function public.semear_motivos_de_perda(uuid) from public, anon;
grant execute on function public.semear_motivos_de_perda(uuid) to authenticated, service_role;

-- Empresa nova nasce com a lista, sem ninguém precisar lembrar — mesmo desenho
-- da semeadura de modelos.
create or replace function public.tg_semear_motivos_de_perda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_motivos_de_perda(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_semeia_motivos_de_perda on public.organizations;
create trigger organizations_semeia_motivos_de_perda
after insert on public.organizations
for each row execute function public.tg_semear_motivos_de_perda();

-- E as que já existem.
do $$
declare v_org record;
begin
  for v_org in select id from public.organizations loop
    perform public.semear_motivos_de_perda(v_org.id);
  end loop;
end;
$$;

commit;
