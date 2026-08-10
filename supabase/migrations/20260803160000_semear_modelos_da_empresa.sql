-- Empresa nova nasce com a própria cópia dos modelos padrão.
--
-- É o pedido do responsável em 3 de agosto: *"as documentações e mensagens
-- padrão que eu escolher se repete para todas, e o que muda seriam as
-- documentações que o admin da empresa muda"*. A cópia é o que torna as duas
-- coisas verdadeiras ao mesmo tempo — o padrão se repete, e mexer na cópia não
-- mexe no padrão nem no de nenhuma outra empresa.
--
-- **Cópia e não referência.** Referência faria toda empresa passar a usar a
-- versão nova assim que o padrão mudasse, inclusive num contrato já em uso.
-- Quem quiser o padrão atualizado traz de novo, por decisão — e `derived_from`
-- guarda de onde cada cópia veio, o que permite depois mostrar no que a empresa
-- divergiu do padrão.
--
-- O responsável perguntou se não seria melhor uma tabela por empresa. A
-- resposta, com os números do banco de homologação, está em
-- `VACINA-051`: 166 tabelas × N empresas troca uma garantia do banco por uma
-- convenção de código, e a garantia é o que se quer manter.

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

revoke all on function public.semear_modelos_da_empresa(uuid) from public, anon;
grant execute on function public.semear_modelos_da_empresa(uuid) to authenticated, service_role;

comment on function public.semear_modelos_da_empresa(uuid) is
  'Copia os modelos PLATAFORMA para a empresa, como linhas dela. Idempotente: só traz o que ainda não veio.';

-- No cadastro da empresa, automático: ninguém precisa lembrar.
create or replace function public.tg_semear_modelos_da_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_modelos_da_empresa(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_semeia_modelos on public.organizations;
create trigger organizations_semeia_modelos
after insert on public.organizations
for each row execute function public.tg_semear_modelos_da_empresa();

commit;
