-- Motivo de perda separado da observação da mudança de estágio — T-32.0.6.
--
-- Hoje a tela do funil tem **um campo só**, rotulado "Motivo/observação", que
-- serve a toda mudança de estágio e vira `lost_reason` quando o estágio é
-- `LOST`. As duas coisas que ele carrega são diferentes em natureza:
--
--   - **motivo**: por que se perdeu. É curto, se repete entre negócios e serve
--     para contar — "Preço", "Prazo", "Concorrente", "Cliente adiou".
--   - **observação**: o que aconteceu naquele negócio. É prosa, é única, e
--     serve para quem for ler aquele histórico.
--
-- Juntas num campo só, nenhuma das duas funciona. Não dá para somar motivo de
-- perda por trimestre, porque cada linha é uma frase diferente; e quem quer
-- contar acaba padronizando a frase, perdendo o relato.
--
-- É também o que impedia ligar a sugestão de vocabulário a este campo: sugerir
-- valores para uma caixa de prosa empurraria a pessoa a reaproveitar um texto
-- genérico, que é o defeito que a diretriz de reúso nomeia — dado errado com
-- aparência de arrumado.
--
-- **Linhas antigas não são reclassificadas.** O que está em `reason` foi
-- escrito sob a regra antiga e pode ser motivo, observação ou os dois; decidir
-- por elas agora seria inventar dado. Elas continuam em `reason`, e a tela
-- mostra as duas colunas.

begin;

alter table public.crm_opportunity_stage_history
  add column if not exists note text;

comment on column public.crm_opportunity_stage_history.reason is
  'Motivo curto e contável da mudança — obrigatório em LOST. Linhas anteriores a 3 de agosto de 2026 podem conter prosa, de quando este campo acumulava motivo e observação.';
comment on column public.crm_opportunity_stage_history.note is
  'Observação livre daquela mudança. Prosa, sem vocabulário compartilhado, nunca sugerida.';

create or replace function public.move_crm_opportunity_stage(
  p_opportunity_id uuid,
  p_to_stage text,
  p_reason text default null,
  p_note text default null
) returns public.opportunities
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_opportunity public.opportunities;
  v_from text;
  v_probability numeric;
begin
  select * into v_opportunity from public.opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'Oportunidade não encontrada.'; end if;
  if not public.has_module_permission(v_opportunity.organization_id,'crm','EDIT',null,null) then
    raise exception 'Permissão insuficiente para mover oportunidade.';
  end if;
  if p_to_stage not in ('PROSPECTING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST') then
    raise exception 'Estágio inválido.';
  end if;
  -- Continua obrigatório, e agora exige o campo certo: observação preenchida
  -- não substitui o motivo. Antes, qualquer texto na caixa única satisfazia a
  -- regra, e "cliente sumiu" entrava como motivo contável.
  if p_to_stage='LOST' and nullif(trim(p_reason),'') is null then
    raise exception 'O motivo da perda é obrigatório.';
  end if;
  if p_to_stage='WON' and v_opportunity.client_id is null then
    raise exception 'Oportunidade ganha precisa estar vinculada a cliente.';
  end if;

  v_from:=v_opportunity.stage;
  if v_from=p_to_stage then return v_opportunity; end if;
  v_probability:=case p_to_stage
    when 'PROSPECTING' then 10 when 'QUALIFIED' then 35 when 'PROPOSAL' then 60
    when 'NEGOTIATION' then 80 when 'WON' then 100 when 'LOST' then 0 end;

  perform set_config('app.stage18_rpc','true',true);
  update public.opportunities
     set stage=p_to_stage,
         probability=v_probability,
         lost_reason=case when p_to_stage='LOST' then nullif(trim(p_reason),'') else null end,
         closed_at=case when p_to_stage in ('WON','LOST') then now() else null end,
         updated_at=now()
   where id=v_opportunity.id
  returning * into v_opportunity;

  insert into public.crm_opportunity_stage_history(
    organization_id,opportunity_id,from_stage,to_stage,reason,note,changed_by
  ) values (
    v_opportunity.organization_id,v_opportunity.id,v_from,p_to_stage,
    nullif(trim(p_reason),''),nullif(trim(p_note),''),auth.uid()
  );
  return v_opportunity;
end $function$;

revoke all on function public.move_crm_opportunity_stage(uuid, text, text, text) from public, anon;
grant execute on function public.move_crm_opportunity_stage(uuid, text, text, text) to authenticated, service_role;

-- A assinatura de três argumentos sai de circulação: mantida, ela deixaria dois
-- caminhos para a mesma operação, e o antigo grava sem observação em silêncio.
drop function if exists public.move_crm_opportunity_stage(uuid, text, text);

commit;
