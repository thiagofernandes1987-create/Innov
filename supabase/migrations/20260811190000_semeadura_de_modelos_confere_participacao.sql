-- Separada de `20260811061000` em 11/08/2026, depois de medir o banco.
--
-- Aquela migration junta duas coisas com dependências diferentes: as cinco
-- funções da ponte de IA de canal, cujas tabelas **não existem no banco** (são
-- da etapa 22, não aplicada), e a semeadura de modelos, que **está viva**.
--
-- Medido no projeto remoto:
--
--   semear_modelos_da_empresa(p_organization_id uuid)  definidora, concedida a
--                                                      `authenticated`, SEM GUARDA
--   tg_semear_modelos_da_empresa()                     executável por `anon`
--
-- Junta, a migration só poderia ser aplicada depois da etapa 22 inteira, e a
-- correção de uma escrita cross-tenant viva ficaria esperando por um módulo que
-- não tem relação com ela. Separadas, esta entra sozinha.
--
-- Conteúdo idêntico ao que estava na outra; nada foi reescrito.

begin;


create or replace function public.semear_modelos_da_empresa(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copiados integer;
begin
  if p_organization_id is null then
    raise exception 'organização não informada';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'sem acesso a esta organização';
  end if;

  insert into public.document_templates (
    organization_id, scope, name, document_type, description, body_markdown,
    variables, client_visible, status, version_number, derived_from,
    published_at, created_at, updated_at
  )
  select
    p_organization_id, 'ORGANIZACAO', padrao.name, padrao.document_type, padrao.description,
    padrao.body_markdown, padrao.variables, padrao.client_visible, padrao.status, 1, padrao.id,
    case when padrao.status = 'PUBLISHED' then now() end, now(), now()
  from public.document_templates padrao
  where padrao.scope = 'PLATAFORMA'
    and padrao.archived_at is null
    -- Idempotente: rodar de novo traz só o que ainda não veio. É o que permite
    -- usar a mesma função no cadastro da empresa e no botão "trazer padrões"
    -- de quem já existia antes de o padrão ser publicado.
    and not exists (
      select 1 from public.document_templates copia
       where copia.organization_id = p_organization_id
         and copia.derived_from = padrao.id
         and copia.archived_at is null
    );

  get diagnostics v_copiados = row_count;
  return v_copiados;
end;
$$;

comment on function public.semear_modelos_da_empresa(uuid) is
  'Copia os modelos PLATAFORMA para a empresa, como linhas dela. Idempotente: só traz o que ainda não veio. Recusa organização de que o chamador não participa.';

-- O gatilho semeava chamando a função acima. Com o guarda, essa chamada passa a
-- falhar exatamente onde ela precisa funcionar: no `insert` de `organizations`,
-- quando a empresa acabou de nascer e ainda não existe participação para
-- conferir — a mesma armadilha que a semeadura de motivos de perda tem em
-- `20260811060000`. O gatilho copia direto, com o mesmo conteúdo e a mesma
-- idempotência, e não passa mais pela função concedida ao usuário final.
create or replace function public.tg_semear_modelos_da_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.document_templates (
    organization_id, scope, name, document_type, description, body_markdown,
    variables, client_visible, status, version_number, derived_from,
    published_at, created_at, updated_at
  )
  select
    new.id, 'ORGANIZACAO', padrao.name, padrao.document_type, padrao.description,
    padrao.body_markdown, padrao.variables, padrao.client_visible, padrao.status, 1, padrao.id,
    case when padrao.status = 'PUBLISHED' then now() end, now(), now()
  from public.document_templates padrao
  where padrao.scope = 'PLATAFORMA'
    and padrao.archived_at is null
    and not exists (
      select 1 from public.document_templates copia
       where copia.organization_id = new.id
         and copia.derived_from = padrao.id
         and copia.archived_at is null
    );
  return new;
end;
$$;

revoke all on function public.tg_semear_modelos_da_empresa() from public, anon, authenticated;

commit;
