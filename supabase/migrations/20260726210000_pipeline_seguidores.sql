-- Pipeline — seguidores do cartão.
-- Sprint S-23. Pedido do responsável: o cartão precisa mostrar quem responde
-- por ele e quem acompanha.
--
-- Responsável e seguidor são coisas diferentes, e misturar as duas é o erro
-- clássico: um cartão tem **um** responsável — a pessoa que responde se o
-- prazo estourar — e **vários** seguidores, que só querem saber quando algo
-- muda. Responsável já existe como coluna em `pipeline_cards`; seguidor é
-- lista, então é tabela.

create table if not exists public.pipeline_card_followers (
  card_id uuid not null references public.pipeline_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Quem colocou a pessoa para seguir. Ninguém deveria descobrir que virou
  -- seguidor sem saber quem o inscreveu.
  adicionado_por uuid references auth.users(id) on delete set null,
  adicionado_em timestamptz not null default now(),
  primary key (card_id, user_id),
  foreign key (card_id, organization_id)
    references public.pipeline_cards(id, organization_id) on delete cascade
);

create index if not exists pipeline_card_followers_user_idx
  on public.pipeline_card_followers(user_id, adicionado_em desc);

alter table public.pipeline_card_followers enable row level security;
alter table public.pipeline_card_followers force row level security;

drop policy if exists pipeline_card_followers_read on public.pipeline_card_followers;
create policy pipeline_card_followers_read on public.pipeline_card_followers
for select to authenticated
using (public.pipeline_permite_cartao(card_id, 'READ'));

-- Quem pode editar o cartão pode inscrever alguém; qualquer um que enxergue o
-- cartão pode inscrever a si mesmo. Seguir o que já se pode ler não aumenta
-- acesso nenhum.
drop policy if exists pipeline_card_followers_insert on public.pipeline_card_followers;
create policy pipeline_card_followers_insert on public.pipeline_card_followers
for insert to authenticated
with check (
  public.pipeline_permite_cartao(card_id, 'EDIT')
  or (user_id = auth.uid() and public.pipeline_permite_cartao(card_id, 'READ'))
);

-- Sair da lista é direito de quem está nela; tirar outra pessoa exige edição.
drop policy if exists pipeline_card_followers_delete on public.pipeline_card_followers;
create policy pipeline_card_followers_delete on public.pipeline_card_followers
for delete to authenticated
using (
  user_id = auth.uid()
  or public.pipeline_permite_cartao(card_id, 'EDIT')
);

revoke all on public.pipeline_card_followers from anon, authenticated;
grant select, insert, delete on public.pipeline_card_followers to authenticated;

-- Sem UPDATE: seguir ou não seguir são duas linhas de estado, não um campo a
-- editar. Trocar o `user_id` de uma inscrição seria inscrever outra pessoa
-- sem passar pela política de inserção.

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'pipeline_card_followers' and c.relrowsecurity
  ) then
    raise exception 'pipeline_card_followers sem RLS habilitada.';
  end if;

  if has_table_privilege('authenticated', 'public.pipeline_card_followers', 'update') then
    raise exception 'pipeline_card_followers concede UPDATE — seguir não é campo a editar.';
  end if;
end;
$$;
