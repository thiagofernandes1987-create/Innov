-- Catálogo de valores usados — T-32.0.
--
-- O princípio, da diretriz de reúso: **todo campo cujo valor se repete entre
-- registros é um campo com vocabulário próprio da organização.** "Fundação",
-- "alvenaria", "instalações" não são texto livre; digitar de novo a cada obra é
-- onde nasce "Fundação", "fundacao" e "Fundação " com espaço no fim.
--
-- Uma tabela e um componente servem a EAP, funil, marcador, disciplina,
-- unidade, motivo de perda e motivo de parada.
--
-- **A chave normalizada vem pronta do TypeScript.** Normalizar também aqui
-- criaria duas implementações da mesma regra, e a primeira divergência — um
-- caractere que um lado tira e o outro não — vira entrada duplicada no
-- catálogo, que é exatamente o defeito que ele existe para evitar.
--
-- **Sugestão nunca é lista fechada**: nada nesta migration restringe o que pode
-- ser gravado nos campos de origem. Lista fechada resolveria a grafia e criaria
-- um problema pior — quem precisa de um valor inédito passa a escolher o mais
-- parecido, e o dado fica errado com aparência de arrumado.

-- **O guarda é participação na organização, não permissão de módulo.** O
-- vocabulário é da empresa inteira e serve EAP, funil, marcador, disciplina e
-- unidade ao mesmo tempo; amarrá-lo a um módulo faria a sugestão depender de
-- qual app está instalado. A primeira versão desta migration usava
-- `has_module_permission(org, 'dashboard', 'READ')` — e `dashboard` não existe
-- em `app_modules`, então o guarda negava todo mundo em silêncio (VACINA-053).

begin;

create table if not exists public.value_catalog (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope           text not null,
  normalized      text not null,
  label           text not null,
  uses            integer not null default 1,
  first_used_at   timestamptz not null default now(),
  last_used_at    timestamptz not null default now(),
  primary key (organization_id, scope, normalized),
  constraint value_catalog_normalizado_nao_vazio check (length(trim(normalized)) > 0),
  constraint value_catalog_usos_positivos check (uses > 0)
);

comment on table public.value_catalog is
  'Vocabulário da organização por escopo. A chave é a forma normalizada, e `label` guarda a grafia que a empresa usa. Sugestão, nunca lista fechada.';
comment on column public.value_catalog.normalized is
  'Calculada em lib/sugestoes/catalogo.ts e enviada pronta. Uma implementação só: normalizar também aqui criaria duas regras que divergem no primeiro caractere novo, e a divergência vira entrada duplicada.';
comment on column public.value_catalog.label is
  'A grafia exibida. Acompanha o uso mais recente: o vocabulário da empresa é o que ela escreve hoje.';

create index if not exists value_catalog_escopo_idx
  on public.value_catalog (organization_id, scope, last_used_at desc);

alter table public.value_catalog enable row level security;
alter table public.value_catalog force row level security;

drop policy if exists value_catalog_read on public.value_catalog;
create policy value_catalog_read on public.value_catalog
for select to authenticated
using (public.is_org_member(organization_id));

-- Sem política de escrita para `authenticated`, de propósito: o catálogo é da
-- organização inteira, e deixar cada tela gravar direto abriria caminho para
-- uma pessoa despejar trezentos valores nele. Entra pela RPC.

create or replace function public.registrar_valor_usado(
  p_organization_id uuid,
  p_scope text,
  p_label text,
  p_normalized text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'sem acesso a esta organização';
  end if;
  if p_normalized is null or trim(p_normalized) = '' then return; end if;

  insert into public.value_catalog (organization_id, scope, normalized, label)
  values (p_organization_id, trim(p_scope), trim(p_normalized), trim(p_label))
  on conflict (organization_id, scope, normalized) do update
    set uses = public.value_catalog.uses + 1,
        last_used_at = now(),
        label = excluded.label;
end;
$$;

revoke all on function public.registrar_valor_usado(uuid, text, text, text) from public, anon;
grant execute on function public.registrar_valor_usado(uuid, text, text, text) to authenticated, service_role;

-- Limpar o catálogo é ação de administrador: uma pessoa não desfaz o
-- vocabulário de todas as outras.
create or replace function public.limpar_valor_do_catalogo(
  p_organization_id uuid,
  p_scope text,
  p_normalized text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removidos integer;
begin
  if not public.has_module_permission(p_organization_id, 'administracao', 'DELETE', null, null) then
    raise exception 'limpar o catálogo exige administração da organização';
  end if;

  delete from public.value_catalog
   where organization_id = p_organization_id
     and scope = p_scope
     and (p_normalized is null or normalized = p_normalized);
  get diagnostics v_removidos = row_count;
  return v_removidos;
end;
$$;

revoke all on function public.limpar_valor_do_catalogo(uuid, text, text) from public, anon;
grant execute on function public.limpar_valor_do_catalogo(uuid, text, text) to authenticated, service_role;

commit;
