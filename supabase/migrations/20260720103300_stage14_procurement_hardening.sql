-- Etapa 14 — hardening identificado durante a homologação.

-- Permite gerar novo convite quando o anterior foi revogado.
alter table public.procurement_supplier_invitations
  drop constraint if exists procurement_supplier_invitations_rfq_id_supplier_id_key;
create unique index if not exists procurement_active_invitation_supplier_idx
  on public.procurement_supplier_invitations(rfq_id,supplier_id)
  where revoked_at is null;

-- Validação de convite no relógio do PostgreSQL. Somente o servidor pode chamar.
create or replace function public.get_procurement_invitation_by_token(p_token_sha256 text)
returns public.procurement_supplier_invitations
language sql stable security definer set search_path=public as $$
  select invitation
  from public.procurement_supplier_invitations invitation
  where invitation.token_sha256=p_token_sha256
    and invitation.revoked_at is null
    and (invitation.expires_at is null or invitation.expires_at>now())
  limit 1;
$$;
revoke all on function public.get_procurement_invitation_by_token(text) from public,anon,authenticated;
grant execute on function public.get_procurement_invitation_by_token(text) to service_role;

-- Um recebimento não pode alterar o pedido sem itens registrados.
create or replace function public.finalize_procurement_receipt(p_receipt_id uuid)
returns public.procurement_receipts
language plpgsql security definer set search_path=public as $$
declare
  v public.procurement_receipts;
  v_order public.procurement_orders;
  r record;
  v_remaining numeric;
  v_rejected numeric;
  v_open integer;
  v_items integer;
begin
  select * into v from public.procurement_receipts where id=p_receipt_id for update;
  if not found or v.status<>'DRAFT' then raise exception 'Recebimento em rascunho não encontrado.'; end if;
  select count(*) into v_items from public.procurement_receipt_items where receipt_id=v.id;
  if v_items=0 then raise exception 'Inclua ao menos um item recebido.'; end if;
  select * into v_order from public.procurement_orders where id=v.order_id for update;
  for r in
    select ri.*,oi.received_quantity as prior_received,oi.ordered_quantity
    from public.procurement_receipt_items ri
    join public.procurement_order_items oi on oi.id=ri.order_item_id
    where ri.receipt_id=v.id
  loop
    v_remaining:=r.ordered_quantity-r.prior_received;
    if r.received_quantity>v_remaining then raise exception 'Quantidade recebida superior ao saldo do pedido.'; end if;
    update public.procurement_order_items
      set received_quantity=received_quantity+r.received_quantity
      where id=r.order_item_id;
  end loop;
  select coalesce(sum(rejected_quantity),0) into v_rejected
    from public.procurement_receipt_items where receipt_id=v.id;
  update public.procurement_receipts
    set status=case when v_rejected>0 then 'ACCEPTED_WITH_RESTRICTION' else 'ACCEPTED' end,updated_at=now()
    where id=v.id returning * into v;
  select count(*) into v_open from public.procurement_order_items
    where order_id=v_order.id and received_quantity<ordered_quantity;
  update public.procurement_orders
    set status=case when v_open=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,updated_at=now()
    where id=v_order.id;
  update public.procurement_requests
    set status=case when v_open=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,updated_at=now()
    where id=v_order.request_id;
  insert into public.procurement_events(organization_id,project_id,request_id,order_id,receipt_id,event_type,metadata)
    values(v.organization_id,v.project_id,v_order.request_id,v.order_id,v.id,'RECEIPT_FINALIZED',jsonb_build_object('status',v.status,'hasRejected',v_rejected>0));
  return v;
end $$;
revoke all on function public.finalize_procurement_receipt(uuid) from public,anon,authenticated;
grant execute on function public.finalize_procurement_receipt(uuid) to service_role;

-- Instala Compras e sua matriz de permissões em futuras organizações.
create or replace function public.install_procurement_defaults(p_organization_id uuid)
returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
  select p_organization_id,module.id,'ENABLED',module.version,
    jsonb_build_object('supplierPublicSignup',false,'inventoryEnabled',false),now()
  from public.app_modules module where module.key='compras'
  on conflict(organization_id,module_id) do update set
    status='ENABLED',installed_version=excluded.installed_version,
    settings=public.organization_modules.settings||excluded.settings,
    enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,
    can_export,can_administer,can_view_sensitive)
  select profile.organization_id,profile.id,module.id,
    case
      when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then 'DELETE'::public.app_access_level
      when profile.base_role in ('GESTOR_OBRAS','ENGENHEIRO','QUALIDADE') then 'EDIT'::public.app_access_level
      when profile.base_role in ('FINANCEIRO','ORCAMENTISTA') then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level
    end,
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO'),
    false,false,
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE','ORCAMENTISTA'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),
    profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA')
  from public.access_profiles profile
  join public.app_modules module on module.key='compras'
  where profile.organization_id=p_organization_id and profile.base_role is not null
  on conflict(profile_id,module_id) do update set
    access_level=excluded.access_level,can_approve=excluded.can_approve,
    can_release=excluded.can_release,can_sign=excluded.can_sign,can_export=excluded.can_export,
    can_administer=excluded.can_administer,can_view_sensitive=excluded.can_view_sensitive,updated_at=now();
end $$;

create or replace function public.install_procurement_defaults_after_organization()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.install_procurement_defaults(new.id);
  return new;
end $$;

drop trigger if exists organizations_install_procurement_defaults on public.organizations;
create trigger organizations_install_procurement_defaults
after insert on public.organizations
for each row execute function public.install_procurement_defaults_after_organization();

select public.install_procurement_defaults(id) from public.organizations;
revoke all on function public.install_procurement_defaults(uuid) from public,anon,authenticated;
revoke all on function public.install_procurement_defaults_after_organization() from public,anon,authenticated;
grant execute on function public.install_procurement_defaults(uuid) to service_role;
