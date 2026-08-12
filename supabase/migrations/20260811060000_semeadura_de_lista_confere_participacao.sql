-- `semear_motivos_de_perda` recebia o `organization_id` de quem chama e escrevia
-- nele sem perguntar se o chamador pertence àquela organização.
--
-- A função é `security definer` e está concedida a `authenticated`. Isso soma
-- três coisas: ela roda com os privilégios do dono, ignora RLS, e aceita como
-- parâmetro justamente o campo que separa uma empresa da outra. Qualquer
-- usuário autenticado de qualquer organização podia chamá-la com o UUID de
-- outra e inserir nove linhas em `managed_list_values` de lá.
--
-- O efeito é pequeno — a lista é fixa, a inserção é idempotente por
-- `on conflict do nothing`, não há leitura de dado alheio e nada é apagado.
-- Mas é escrita cross-tenant, que é exatamente o que a RLS existe para impedir
-- em todo o resto do esquema. Privilégio de definidor não é conveniência: onde
-- ele entra, a conferência que a RLS faria precisa ser feita à mão.
--
-- A função irmã da mesma sprint já fazia certo. Em
-- `20260803200000_catalogo_de_valores_usados.sql`, `registrar_valor_usado`
-- abre com `if not public.is_org_member(p_organization_id)`. Esta ficou sem, e
-- a diferença passou porque as duas fazem coisa parecida e nenhuma delas
-- reprovava teste nenhum.
--
-- Corpo idêntico ao anterior, com o guarda na entrada.

begin;

create or replace function public.semear_motivos_de_perda(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inseridos integer;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'sem acesso a esta organização';
  end if;

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
  'Ponto de partida dos motivos de perda da empresa. Idempotente: só traz o que ainda não existe, e nunca reescreve o que a empresa editou. Recusa organização de que o chamador não participa.';

revoke all on function public.semear_motivos_de_perda(uuid) from public, anon;
grant execute on function public.semear_motivos_de_perda(uuid) to authenticated, service_role;

-- O gatilho que semeia a empresa nova continua chamando esta função, e roda
-- como `security definer` na criação da organização — momento em que ainda não
-- existe participação para conferir. Por isso ele não passa por aqui: semeia
-- direto, com o mesmo conteúdo.
create or replace function public.tg_semear_motivos_de_perda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.managed_list_values (organization_id, scope, label, normalized, position)
  select new.id, 'negocio.motivo_perda', item.label, item.normalized, item.pos
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
  return new;
end;
$$;

revoke all on function public.tg_semear_motivos_de_perda() from public, anon, authenticated;

commit;
