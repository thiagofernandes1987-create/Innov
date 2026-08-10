-- T-37.12 — a referência oficial não deixa de ser oficial por um `update`.
--
-- `guard_official_cost_reference` bloqueia escrita de quem não é `postgres` nem
-- `service_role` **quando a linha é oficial**. O jeito de saber se é oficial era:
--
--   if tg_table_name='cost_compositions' then
--     v_source_key := case when tg_op='DELETE' then old.source_key else new.source_key end;
--
-- No `UPDATE`, ele olha o valor **novo** do campo que decide se o gatilho se
-- aplica. Então basta trocar o campo primeiro. Medido, com sessão `authenticated`
-- de membro interno, em 4 de agosto de 2026:
--
--   update cost_compositions set source_key = 'PROPRIA'  → PERMITIDO
--   update cost_composition_versions set unit_cost = 1   → 208,33 virou 1,00
--   update cost_composition_items   set unit_cost = 0.01 → REESCRITO
--
-- Dois passos, e o custo publicado pela CAIXA vira o que a pessoa quiser, com a
-- procedência (`source_url`, `source_sha256`, `base_date`) intacta ao lado —
-- que é o pior formato possível: o número mudou e a evidência continua dizendo
-- de onde ele veio.
--
-- A regra passa a ser sobre o que a linha **é**, não sobre o que ela vai virar:
--
--   INSERT  recusa quando a linha nasce oficial;
--   UPDATE  recusa quando era oficial **ou** quando passaria a ser — mudar de
--           dono nos dois sentidos é o que estava aberto;
--   DELETE  recusa quando era oficial.
--
-- Nos filhos, o mesmo: a versão é conferida contra a composição **antiga e
-- nova**, e o item contra a versão antiga e nova. Sem isso, mover um item para
-- outra versão contornaria a guarda pelo outro lado.
--
-- O CUB entra na mesma proteção. Hoje ele depende só da política de RLS, que é
-- de leitura — conferido: `update` de membro interno não tem efeito. Mas
-- proteção que existe num lugar e não no outro é proteção que alguém vai mover
-- sem perceber; e o privilégio bruto ainda concedia escrita, que é a
-- VACINA-059 outra vez, com outro comando.

begin;

create or replace function public.guard_official_cost_reference()
returns trigger
language plpgsql
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_antiga text;
  v_nova text;
  v_pai_antigo uuid;
  v_pai_novo uuid;
begin
  -- O importador roda como `service_role`; a migração e a semeadura, como
  -- `postgres`. São os dois únicos caminhos autorizados a mexer no oficial.
  if current_user in ('postgres', 'service_role') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name in ('cost_catalog_items', 'cost_compositions', 'cost_reference_snapshots') then
    if tg_op <> 'INSERT' then v_antiga := old.source_key; end if;
    if tg_op <> 'DELETE' then v_nova := new.source_key; end if;

  elsif tg_table_name = 'cost_composition_versions' then
    if tg_op <> 'INSERT' then v_pai_antigo := old.composition_id; end if;
    if tg_op <> 'DELETE' then v_pai_novo := new.composition_id; end if;
    select source_key into v_antiga from public.cost_compositions where id = v_pai_antigo;
    select source_key into v_nova from public.cost_compositions where id = v_pai_novo;

  elsif tg_table_name = 'cost_composition_items' then
    if tg_op <> 'INSERT' then v_pai_antigo := old.composition_version_id; end if;
    if tg_op <> 'DELETE' then v_pai_novo := new.composition_version_id; end if;
    select composicao.source_key into v_antiga
    from public.cost_composition_versions versao
    join public.cost_compositions composicao on composicao.id = versao.composition_id
    where versao.id = v_pai_antigo;
    select composicao.source_key into v_nova
    from public.cost_composition_versions versao
    join public.cost_compositions composicao on composicao.id = versao.composition_id
    where versao.id = v_pai_novo;
  end if;

  -- Vocabulário fechado das fontes oficiais. Fonte nova entra aqui de propósito:
  -- esquecer de incluí-la deixa a referência editável, e é melhor que a lista
  -- seja curta e revisada do que ampla e adivinhada.
  if coalesce(v_antiga, '') in ('SINAPI_CAIXA', 'SINDUSCON_SP_CUB')
     or coalesce(v_nova, '') in ('SINAPI_CAIXA', 'SINDUSCON_SP_CUB') then
    raise exception 'Referência oficial de custo é imutável fora do importador autorizado.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

drop trigger if exists trg_guard_official_reference_snapshots on public.cost_reference_snapshots;
create trigger trg_guard_official_reference_snapshots
before insert or update or delete on public.cost_reference_snapshots
for each row execute function public.guard_official_cost_reference();

-- O privilégio bruto acompanha a política: estas duas tabelas são do sistema —
-- ninguém as edita pela aplicação, só o importador e o trabalho agendado.
revoke insert, update, delete on public.cost_reference_snapshots from anon, authenticated;
revoke insert, update, delete on public.cost_source_sync_runs from anon, authenticated;

commit;
