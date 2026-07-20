-- Etapa 13 — aplicativo modular, perfis e modelos iniciais editáveis.

insert into public.app_modules(key,name,description,href,icon_key,display_order,active,sensitive,version,category,manifest,default_enabled,is_core)
values('qualidade','Qualidade e Formulários','Biblioteca online, FVS, FVM, formulários e pesquisas.','/app/qualidade','quality',140,true,false,'1.0.0','Qualidade',jsonb_build_object('navigationLabel','Qualidade','onlineOnly',true,'plugin','quality-forms','dependencies',jsonb_build_array('obras')),true,false)
on conflict(key) do update set name=excluded.name,description=excluded.description,href=excluded.href,icon_key=excluded.icon_key,display_order=excluded.display_order,active=true,version=excluded.version,category=excluded.category,manifest=excluded.manifest,default_enabled=true,deprecated_at=null,updated_at=now();

insert into public.organization_modules(organization_id,module_id,status,installed_version,settings,enabled_at)
select o.id,m.id,'ENABLED',m.version,jsonb_build_object('onlineOnly',true),now()
from public.organizations o cross join public.app_modules m where m.key='qualidade'
on conflict(organization_id,module_id) do update set status='ENABLED',installed_version=excluded.installed_version,settings=public.organization_modules.settings||excluded.settings,enabled_at=coalesce(public.organization_modules.enabled_at,now()),disabled_at=null,archived_at=null,updated_at=now();

insert into public.access_profiles(organization_id,code,name,description,base_role,system,active)
select o.id,p.code,p.name,p.description,p.role::public.org_role,true,true
from public.organizations o cross join (values
 ('super-admin','Super Administrador','Acesso completo à plataforma.','SUPER_ADMIN'),
 ('direcao','Direção','Gestão, aprovações e informações sensíveis.','DIRECAO'),
 ('administrador','Administrador','Administração operacional da plataforma.','ADMINISTRADOR'),
 ('vendas','Vendas','CRM, clientes e propostas comerciais.','COMERCIAL'),
 ('gestor-obras','Operacional / Gestor de Obras','Obras, planejamento, campo e qualidade.','GESTOR_OBRAS'),
 ('engenharia','Engenharia','Planejamento, campo e inspeções técnicas.','ENGENHEIRO'),
 ('orcamentista','Orçamentista','Orçamentos e documentos associados.','ORCAMENTISTA'),
 ('financeiro','Financeiro','Financeiro, contratos e relatórios.','FINANCEIRO'),
 ('qualidade','Qualidade','Modelos, inspeções, documentos e aprovações de qualidade.','QUALIDADE'),
 ('pos-venda','Pós-venda','Ocorrências, pesquisas e relacionamento.','SAC'),
 ('cliente','Cliente','Acesso ao portal do cliente.','CLIENTE')
) as p(code,name,description,role)
on conflict(organization_id,code) do update set name=excluded.name,description=excluded.description,base_role=excluded.base_role,system=true,active=true,updated_at=now();

insert into public.profile_module_permissions(organization_id,profile_id,module_id,access_level,can_approve,can_release,can_sign,can_export,can_administer,can_view_sensitive)
select p.organization_id,p.id,m.id,
 case when p.code in ('super-admin','direcao','administrador','qualidade') then 'DELETE'::public.app_access_level
      when p.code in ('gestor-obras','engenharia','pos-venda') then 'EDIT'::public.app_access_level
      when p.code='cliente' then 'READ'::public.app_access_level
      else 'NONE'::public.app_access_level end,
 p.code in ('super-admin','direcao','administrador','qualidade'),
 p.code in ('super-admin','direcao','administrador','qualidade','pos-venda'),
 false,
 p.code in ('super-admin','direcao','administrador','qualidade','gestor-obras','engenharia','pos-venda'),
 p.code in ('super-admin','direcao','administrador','qualidade'),
 false
from public.access_profiles p join public.app_modules m on m.key='qualidade'
on conflict(profile_id,module_id) do update set access_level=excluded.access_level,can_approve=excluded.can_approve,can_release=excluded.can_release,can_sign=excluded.can_sign,can_export=excluded.can_export,can_administer=excluded.can_administer,can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

update public.organization_memberships om set access_profile_id=p.id
from public.access_profiles p
where p.organization_id=om.organization_id and p.base_role=om.role and p.active and (om.access_profile_id is null or om.access_profile_id<>p.id);

insert into public.membership_access_profiles(organization_id,membership_id,profile_id,scope_type,scope_id,active,starts_at)
select om.organization_id,om.id,p.id,'ORGANIZATION',om.organization_id,true,now()
from public.organization_memberships om join public.access_profiles p on p.organization_id=om.organization_id and p.base_role=om.role
where om.active and not exists(select 1 from public.membership_access_profiles map where map.membership_id=om.id and map.profile_id=p.id and map.active);

with templates as (
  insert into public.quality_form_templates(organization_id,code,title,description,kind,scope,status,allow_attachments,allow_photos)
  select o.id,v.code,v.title,v.description,v.kind::public.quality_form_kind,v.scope::public.quality_form_scope,'PUBLISHED',true,true
  from public.organizations o cross join (values
    ('FVS-PADRAO','Ficha de Verificação de Serviço','Modelo inicial editável para inspeção de serviços.','FVS','INTERNAL'),
    ('FVM-PADRAO','Ficha de Verificação de Material','Modelo inicial editável para recebimento e inspeção de materiais.','FVM','INTERNAL'),
    ('PESQUISA-SATISFACAO','Pesquisa de satisfação do cliente','Pesquisa simples de satisfação e recomendação.','SURVEY','CLIENT')
  ) as v(code,title,description,kind,scope)
  on conflict(organization_id,code) do update set title=excluded.title,description=excluded.description
  returning id,organization_id,code
), versions as (
  insert into public.quality_form_versions(organization_id,template_id,version_number,schema_json,presentation_json,change_summary,frozen_at)
  select t.organization_id,t.id,1,
    case t.code
      when 'FVS-PADRAO' then jsonb_build_object('engineVersion',1,'kind','FVS','fields',jsonb_build_array(
        jsonb_build_object('key','service','type','SHORT_TEXT','label','Serviço verificado','required',true),
        jsonb_build_object('key','location','type','SHORT_TEXT','label','Local / pavimento','required',true),
        jsonb_build_object('key','inspection_date','type','DATE','label','Data da inspeção','required',true),
        jsonb_build_object('key','inspector','type','SHORT_TEXT','label','Responsável pela inspeção','required',true),
        jsonb_build_object('key','checklist','type','CHECKLIST','label','Itens de verificação','required',true,'items',jsonb_build_array(
          jsonb_build_object('key','execution','label','Execução conforme projeto e procedimento'),
          jsonb_build_object('key','dimensions','label','Dimensões, níveis e alinhamentos conferidos'),
          jsonb_build_object('key','finish','label','Acabamento e limpeza adequados'),
          jsonb_build_object('key','safety','label','Condições de segurança atendidas'))),
        jsonb_build_object('key','notes','type','LONG_TEXT','label','Observações','required',false),
        jsonb_build_object('key','evidence','type','PHOTO','label','Evidência fotográfica','required',false)))
      when 'FVM-PADRAO' then jsonb_build_object('engineVersion',1,'kind','FVM','fields',jsonb_build_array(
        jsonb_build_object('key','material','type','SHORT_TEXT','label','Material','required',true),
        jsonb_build_object('key','supplier','type','SHORT_TEXT','label','Fornecedor','required',true),
        jsonb_build_object('key','invoice','type','SHORT_TEXT','label','Nota fiscal','required',false),
        jsonb_build_object('key','batch','type','SHORT_TEXT','label','Lote','required',false),
        jsonb_build_object('key','quantity','type','NUMBER','label','Quantidade recebida','required',true),
        jsonb_build_object('key','receipt_date','type','DATE','label','Data do recebimento','required',true),
        jsonb_build_object('key','checklist','type','CHECKLIST','label','Verificação de recebimento','required',true,'items',jsonb_build_array(
          jsonb_build_object('key','specification','label','Especificação compatível com pedido/projeto'),
          jsonb_build_object('key','integrity','label','Embalagem e integridade preservadas'),
          jsonb_build_object('key','certificate','label','Certificados e laudos conferidos'),
          jsonb_build_object('key','storage','label','Armazenamento adequado definido'))),
        jsonb_build_object('key','decision','type','RADIO','label','Decisão','required',true,'options',jsonb_build_array('ACEITO','ACEITO COM RESSALVA','REJEITADO')),
        jsonb_build_object('key','notes','type','LONG_TEXT','label','Observações','required',false),
        jsonb_build_object('key','evidence','type','PHOTO','label','Foto do material / lote','required',false)))
      else jsonb_build_object('engineVersion',1,'kind','SURVEY','fields',jsonb_build_array(
        jsonb_build_object('key','satisfaction','type','RATING','label','Qual seu nível de satisfação?','required',true,'min',1,'max',5),
        jsonb_build_object('key','nps','type','RATING','label','De 0 a 10, quanto recomendaria a Innovar?','required',true,'min',0,'max',10),
        jsonb_build_object('key','strengths','type','LONG_TEXT','label','O que mais gostou?','required',false),
        jsonb_build_object('key','improvements','type','LONG_TEXT','label','O que podemos melhorar?','required',false),
        jsonb_build_object('key','contact_permission','type','YES_NO','label','Autoriza contato para conversar sobre sua resposta?','required',true)))
    end,
    jsonb_build_object('theme','alpine','showProgress',true),'Modelo inicial da Etapa 13',now()
  from templates t where not exists(select 1 from public.quality_form_versions v where v.template_id=t.id)
  returning id,template_id
)
update public.quality_form_templates t set current_version_id=v.id,status='PUBLISHED',updated_at=now()
from versions v where t.id=v.template_id;
