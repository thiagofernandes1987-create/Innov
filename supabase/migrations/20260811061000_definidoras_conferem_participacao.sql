-- Seis funções `security definer` recebiam o `organization_id` de quem chama e
-- agiam sobre ele sem perguntar se o chamador pertence àquela organização.
--
-- `security definer` roda com os privilégios do dono da função e por isso **não
-- passa por RLS**. Quando a função ainda recebe como parâmetro justamente o
-- campo que separa uma empresa da outra, ela vira uma porta que ignora a
-- política e aceita o destino de quem bate. A conferência que a RLS faria
-- sozinha precisa ser feita à mão, e nestas seis não estava.
--
-- O que dava para fazer, sem ler uma linha de dado alheio:
--
--   reserve_channel_ai_budget   somar no orçamento diário de IA de qualquer
--                               empresa até estourar o teto dela — negação de
--                               serviço em vizinho
--   release_channel_ai_budget   devolver reserva alheia, desfazendo a
--                               contabilidade de quem estava usando
--   commit_channel_ai_budget    mover reservado para consumido em empresa alheia
--   release_channel_ai_conversation  apagar a trava de conversa de outra empresa
--   consume_channel_critical_write_approval  queimar aprovação pendente de
--                               escrita crítica de outra empresa
--   semear_modelos_da_empresa   inserir os modelos PLATAFORMA como linhas de
--                               `document_templates` de outra empresa
--
-- Nenhuma delas é vazamento de leitura; todas são escrita cross-tenant, que é
-- exatamente o que a RLS existe para impedir em todo o resto do esquema.
--
-- As irmãs já faziam certo, e é isso que torna o caso instrutivo. Em
-- `20260804200000_stage22_ai_bridge.sql`, `claim_channel_ai_conversation`,
-- `request_channel_ai_handoff` e `record_channel_ai_invocation` abrem com
-- `has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer')`.
-- Em `20260804220000_stage22_security_hardening.sql`,
-- `approve_channel_critical_write` abre com o mesmo guarda em nível `DELETE`.
-- Em `20260803200000_catalogo_de_valores_usados.sql`, `registrar_valor_usado`
-- abre com `is_org_member`. Mesmo arquivo, mesmo dia, mesmo autor: umas com
-- guarda, outras sem. A diferença não reprovava nada, e por isso durou.
--
-- O guarda de cada uma é o da sua família, não um novo inventado aqui.
--
-- Sobre `service_role`: as seis continuam concedidas a ele, como as irmãs já
-- eram. `has_module_permission` depende de `auth.uid()` e recusa chamada sem
-- sessão, então o plano de execução não pode chamá-las como `service_role` —
-- restrição que as irmãs já carregavam desde a S-22 e que nenhum chamador de
-- hoje esbarra: os seis chamadores vivos estão em `app/actions`, todos passando
-- `context.organizationId`, e `consume_channel_critical_write_approval` não tem
-- chamador nenhum.
--
-- Corpo idêntico ao anterior em todas; muda só a entrada.

begin;

-- ---------------------------------------------------------------------------
-- Ponte de IA de canal — guarda da família: whatsapp/EDIT/administer.
-- ---------------------------------------------------------------------------

create or replace function public.release_channel_ai_conversation(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_owner_id text,
  p_fencing_token bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'AI_FORBIDDEN';
  end if;
  delete from public.channel_ai_conversation_locks
  where organization_id=p_organization_id
    and conversation_id=p_conversation_id
    and lease_owner=p_owner_id
    and fencing_token=p_fencing_token;
  return found;
end;
$$;

create or replace function public.reserve_channel_ai_budget(
  p_organization_id uuid,
  p_amount_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'AI_FORBIDDEN';
  end if;
  if p_amount_micros <= 0 then raise exception 'AI_BUDGET_AMOUNT_INVALID'; end if;
  update public.channel_ai_budget_daily
    set reserved_cost_micros=reserved_cost_micros+p_amount_micros,
        updated_at=clock_timestamp()
  where organization_id=p_organization_id and usage_date=current_date
    and reserved_cost_micros+committed_cost_micros+p_amount_micros <= maximum_cost_micros;
  return found;
end;
$$;

create or replace function public.commit_channel_ai_budget(
  p_organization_id uuid,
  p_reserved_micros bigint,
  p_actual_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'AI_FORBIDDEN';
  end if;
  if p_reserved_micros < 0 or p_actual_micros < 0 or p_actual_micros > p_reserved_micros then
    raise exception 'AI_BUDGET_COMMIT_INVALID';
  end if;
  update public.channel_ai_budget_daily
    set reserved_cost_micros=reserved_cost_micros-p_reserved_micros,
        committed_cost_micros=committed_cost_micros+p_actual_micros,
        updated_at=clock_timestamp()
  where organization_id=p_organization_id and usage_date=current_date
    and reserved_cost_micros >= p_reserved_micros;
  return found;
end;
$$;

create or replace function public.release_channel_ai_budget(
  p_organization_id uuid,
  p_reserved_micros bigint
)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'AI_FORBIDDEN';
  end if;
  if p_reserved_micros <= 0 then raise exception 'AI_BUDGET_RELEASE_INVALID'; end if;
  update public.channel_ai_budget_daily
  set reserved_cost_micros=reserved_cost_micros-p_reserved_micros,
      updated_at=clock_timestamp()
  where organization_id=p_organization_id
    and usage_date=current_date
    and reserved_cost_micros >= p_reserved_micros;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aprovação de escrita crítica — a que concede já conferia; a que queima, não.
-- ---------------------------------------------------------------------------

create or replace function public.consume_channel_critical_write_approval(
  p_organization_id uuid,
  p_action text,
  p_scope_hash text
)
returns boolean
language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
  if not public.has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer') then
    raise exception 'SECURITY_APPROVER_FORBIDDEN';
  end if;
  update public.channel_critical_write_approvals
  set consumed_at=clock_timestamp()
  where organization_id=p_organization_id and action=p_action and scope_hash=lower(p_scope_hash)
    and consumed_at is null and expires_at > clock_timestamp();
  return found;
end $$;

-- ---------------------------------------------------------------------------
-- Semeadura de modelos — guarda da família das semeadoras: is_org_member.
-- ---------------------------------------------------------------------------

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
