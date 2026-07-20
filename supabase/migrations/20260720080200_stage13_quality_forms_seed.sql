-- Etapa 13 — habilitação do aplicativo e modelos iniciais editáveis.

insert into public.applications(key,name,description,icon,category,version,route_prefix,sort_order,dependencies,manifest)
values('qualidade','Qualidade e Formulários','Biblioteca online, FVS, FVM, formulários e pesquisas.','◇','Qualidade','1.0.0','/app/qualidade',140,array['obras'],jsonb_build_object('navigationLabel','Qualidade','onlineOnly',true,'plugin','quality-forms'))
on conflict(key) do update set name=excluded.name,description=excluded.description,version=excluded.version,route_prefix=excluded.route_prefix,manifest=excluded.manifest;

insert into public.application_capabilities(application_id,key,name,description,risk_level,sort_order)
select a.id,c.key,c.name,c.description,c.risk,c.ord from public.applications a
cross join (values
 ('create','Criar','Criar documentos, modelos e atribuições.',2,10),
 ('read','Ler','Consultar biblioteca, formulários e respostas.',1,20),
 ('update','Editar','Editar rascunhos e registros não congelados.',2,30),
 ('delete','Excluir','Arquivar ou excluir registros autorizados.',4,40),
 ('approve','Aprovar','Publicar modelos e aprovar inspeções.',4,50),
 ('release_to_client','Liberar ao cliente','Liberar documentos e formulários ao portal.',4,60),
 ('export','Exportar','Exportar respostas, relatórios e modelos.',2,70),
 ('manage','Administrar','Configurar o aplicativo de Qualidade.',5,80),
 ('assign_users','Atribuir usuários','Distribuir formulários e inspeções.',4,90),
 ('configure','Configurar','Alterar modelos, categorias e regras.',5,100)
) as c(key,name,description,risk,ord)
where a.key='qualidade'
on conflict(application_id,key) do update set name=excluded.name,description=excluded.description,risk_level=excluded.risk_level,sort_order=excluded.sort_order;

insert into public.organization_applications(organization_id,application_id,state,enabled_at)
select o.id,a.id,'ENABLED',now() from public.organizations o join public.applications a on a.key='qualidade'
on conflict(organization_id,application_id) do update set state='ENABLED',enabled_at=coalesce(public.organization_applications.enabled_at,now()),disabled_at=null;

insert into public.profile_capabilities(profile_id,capability_id,effect)
select p.id,c.id,'ALLOW'::public.permission_effect
from public.access_profiles p
join public.application_capabilities c on true
join public.applications a on a.id=c.application_id and a.key='qualidade'
where p.key in ('super-admin','administrador','direcao','qualidade')
on conflict(profile_id,capability_id) do update set effect='ALLOW';

insert into public.profile_capabilities(profile_id,capability_id,effect)
select p.id,c.id,'ALLOW'::public.permission_effect
from public.access_profiles p
join public.application_capabilities c on c.key in ('create','read','update','export')
join public.applications a on a.id=c.application_id and a.key='qualidade'
where p.key in ('operacional','engenharia','pos-venda')
on conflict(profile_id,capability_id) do update set effect='ALLOW';

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
      when 'FVS-PADRAO' then jsonb_build_object(
        'engineVersion',1,'kind','FVS','fields',jsonb_build_array(
          jsonb_build_object('key','service','type','SHORT_TEXT','label','Serviço verificado','required',true),
          jsonb_build_object('key','location','type','SHORT_TEXT','label','Local / pavimento','required',true),
          jsonb_build_object('key','inspection_date','type','DATE','label','Data da inspeção','required',true),
          jsonb_build_object('key','inspector','type','SHORT_TEXT','label','Responsável pela inspeção','required',true),
          jsonb_build_object('key','checklist','type','CHECKLIST','label','Itens de verificação','required',true,'items',jsonb_build_array(
            jsonb_build_object('key','execution','label','Execução conforme projeto e procedimento'),
            jsonb_build_object('key','dimensions','label','Dimensões, níveis e alinhamentos conferidos'),
            jsonb_build_object('key','finish','label','Acabamento e limpeza adequados'),
            jsonb_build_object('key','safety','label','Condições de segurança atendidas')
          )),
          jsonb_build_object('key','notes','type','LONG_TEXT','label','Observações','required',false),
          jsonb_build_object('key','evidence','type','PHOTO','label','Evidência fotográfica','required',false)
        ))
      when 'FVM-PADRAO' then jsonb_build_object(
        'engineVersion',1,'kind','FVM','fields',jsonb_build_array(
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
            jsonb_build_object('key','storage','label','Armazenamento adequado definido')
          )),
          jsonb_build_object('key','decision','type','RADIO','label','Decisão','required',true,'options',jsonb_build_array('ACEITO','ACEITO COM RESSALVA','REJEITADO')),
          jsonb_build_object('key','notes','type','LONG_TEXT','label','Observações','required',false),
          jsonb_build_object('key','evidence','type','PHOTO','label','Foto do material / lote','required',false)
        ))
      else jsonb_build_object(
        'engineVersion',1,'kind','SURVEY','fields',jsonb_build_array(
          jsonb_build_object('key','satisfaction','type','RATING','label','Qual seu nível de satisfação?','required',true,'min',1,'max',5),
          jsonb_build_object('key','nps','type','RATING','label','De 0 a 10, quanto recomendaria a Innovar?','required',true,'min',0,'max',10),
          jsonb_build_object('key','strengths','type','LONG_TEXT','label','O que mais gostou?','required',false),
          jsonb_build_object('key','improvements','type','LONG_TEXT','label','O que podemos melhorar?','required',false),
          jsonb_build_object('key','contact_permission','type','YES_NO','label','Autoriza contato para conversar sobre sua resposta?','required',true)
        ))
    end,
    jsonb_build_object('theme','alpine','showProgress',true),
    'Modelo inicial da Etapa 13',now()
  from templates t
  where not exists(select 1 from public.quality_form_versions v where v.template_id=t.id)
  returning id,template_id
)
update public.quality_form_templates t set current_version_id=v.id,status='PUBLISHED',updated_at=now()
from versions v where t.id=v.template_id;
