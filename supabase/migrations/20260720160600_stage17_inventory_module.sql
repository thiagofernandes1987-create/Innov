-- Etapa 17 — aplicativo plug-and-play, perfis e padrões iniciais.

insert into public.app_modules(
  key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core
) values(
  'estoque','Estoque, Inventário e Almoxarifado',
  'Materiais, depósitos, movimentos, reservas, ferramentas, ativos e inventário físico.',
  '/app/estoque','inventory',160,true,true,'1.0.0','Suprimentos',
  jsonb_build_object(
    'navigationLabel','Estoque',
    'plugin','inventory-management',
    'dependencies',jsonb_build_array('compras','obras'),
    'optionalIntegrations',jsonb_build_array('equipes','financeiro','relatorios'),
    'negativeStockDefault',false,
    'receiptImportIdempotent',true,
    'physicalStocktake',true,
    'individualAssets',true
  ),true,false
)
on conflict(key) do update set
  name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,
  display_order=excluded.display_order,active=true,sensitive=true,version=excluded.version,category=excluded.category,
  manifest=excluded.manifest,default_enabled=true,deprecated_at=null,updated_at=now();

create or replace function public.install_inventory_defaults(p_organization_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_warehouse_id uuid;
begin
  if not exists(select 1 from public.organizations where id=p_organization_id) then
    raise exception 'Organização não encontrada.';
  end if;
  perform public.ensure_organization_access_profiles(p_organization_id);

  insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
  select p_organization_id,module.id,'ENABLED',module.version,
    jsonb_build_object(
      'allowNegativeStock',false,
      'reservationRequiresLocation',true,
      'expiryWarningDays',90,
      'expiryCriticalDays',30,
      'receiptImportEnabled',true
    ),now()
  from public.app_modules module where module.key='estoque'
  on conflict(organization_id,module_id) do update set
    status='ENABLED',installed_version=excluded.installed_version,
    settings=public.organization_modules.settings||excluded.settings,
    enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

  insert into public.profile_module_permissions(
    organization_id,profile_id,module_id,access_level,
    can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive
  )
  select profile.organization_id,profile.id,module.id,
    case
      when profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR') then 'DELETE'::public.app_access_level
      when profile.base_role in ('GESTOR_OBRAS','ENGENHEIRO') then 'EDIT'::public.app_access_level
      when profile.base_role in ('QUALIDADE','FINANCEIRO','ORCAMENTISTA') then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level
    end,
    coalesce(profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS'),false),
    false,false,
    coalesce(profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','GESTOR_OBRAS','ENGENHEIRO','QUALIDADE','FINANCEIRO','ORCAMENTISTA'),false),
    coalesce(profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR'),false),
    coalesce(profile.base_role in ('SUPER_ADMIN','DIRECAO','ADMINISTRADOR','FINANCEIRO','ORCAMENTISTA'),false)
  from public.access_profiles profile
  cross join public.app_modules module
  where profile.organization_id=p_organization_id and profile.base_role is not null and module.key='estoque'
  on conflict(profile_id,module_id) do update set
    access_level=excluded.access_level,can_approve=excluded.can_approve,can_release=false,can_sign=false,
    can_export=excluded.can_export,can_administer=excluded.can_administer,
    can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

  insert into public.inventory_units(organization_id,code,name,decimal_places)
  values
    (p_organization_id,'un','Unidade',0),
    (p_organization_id,'kg','Quilograma',4),
    (p_organization_id,'m','Metro',4),
    (p_organization_id,'m2','Metro quadrado',4),
    (p_organization_id,'m3','Metro cúbico',4),
    (p_organization_id,'l','Litro',4),
    (p_organization_id,'cx','Caixa',2),
    (p_organization_id,'pct','Pacote',2)
  on conflict(organization_id,code) do update set name=excluded.name,decimal_places=excluded.decimal_places,active=true,updated_at=now();

  insert into public.inventory_categories(organization_id,code,name,description)
  values
    (p_organization_id,'MAT','Materiais','Materiais de construção e acabamento.'),
    (p_organization_id,'FER','Ferramentas','Ferramentas manuais e elétricas.'),
    (p_organization_id,'EPI','EPI e Segurança','Equipamentos de proteção e segurança.'),
    (p_organization_id,'ELE','Elétrica','Materiais e componentes elétricos.'),
    (p_organization_id,'HID','Hidráulica','Materiais e componentes hidráulicos.'),
    (p_organization_id,'ATV','Ativos e Equipamentos','Ativos individualizados e equipamentos controlados.')
  on conflict(organization_id,code) do update set name=excluded.name,description=excluded.description,active=true,updated_at=now();

  insert into public.inventory_warehouses(
    organization_id,project_id,code,name,kind,address,allows_negative_stock,active
  ) values(
    p_organization_id,null,'ALM-GERAL','Almoxarifado Geral','GENERAL','',false,true
  )
  on conflict(organization_id,code) do update set
    name=excluded.name,kind='GENERAL',allows_negative_stock=false,active=true,updated_at=now()
  returning id into v_warehouse_id;

  if v_warehouse_id is null then
    select id into v_warehouse_id from public.inventory_warehouses
    where organization_id=p_organization_id and code='ALM-GERAL';
  end if;

  insert into public.inventory_locations(
    organization_id,warehouse_id,code,name,description,is_default,active
  ) values(
    p_organization_id,v_warehouse_id,'PADRAO','Localização padrão','Localização inicial do almoxarifado geral.',true,true
  )
  on conflict(warehouse_id,code) do update set
    name=excluded.name,description=excluded.description,is_default=true,active=true,updated_at=now();
end $$;

select public.install_inventory_defaults(organization.id) from public.organizations organization;

create or replace function public.organizations_install_inventory_defaults()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.install_inventory_defaults(new.id);
  return new;
end $$;

drop trigger if exists organizations_install_inventory_defaults on public.organizations;
create trigger organizations_install_inventory_defaults
after insert on public.organizations
for each row execute function public.organizations_install_inventory_defaults();

revoke all on function public.install_inventory_defaults(uuid) from public,anon,authenticated;
revoke all on function public.organizations_install_inventory_defaults() from public,anon,authenticated;
grant execute on function public.install_inventory_defaults(uuid) to service_role;
