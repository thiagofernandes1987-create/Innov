-- Instala automaticamente os modelos da Qualidade para novas organizações.

create or replace function public.install_quality_default_templates(p_organization_id uuid)
returns void
language plpgsql security definer set search_path=public as $$
declare
  v_template_id uuid;
  v_version_id uuid;
  v_code text;
  v_schema jsonb;
begin
  for v_code,v_schema in
    select * from (values
      ('FVS-PADRAO',jsonb_build_object('engineVersion',1,'kind','FVS','fields',jsonb_build_array(
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
        jsonb_build_object('key','evidence','type','PHOTO','label','Evidência fotográfica','required',false)))),
      ('FVM-PADRAO',jsonb_build_object('engineVersion',1,'kind','FVM','fields',jsonb_build_array(
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
        jsonb_build_object('key','evidence','type','PHOTO','label','Foto do material / lote','required',false)))),
      ('PESQUISA-SATISFACAO',jsonb_build_object('engineVersion',1,'kind','SURVEY','fields',jsonb_build_array(
        jsonb_build_object('key','satisfaction','type','RATING','label','Qual seu nível de satisfação?','required',true,'min',1,'max',5),
        jsonb_build_object('key','nps','type','RATING','label','De 0 a 10, quanto recomendaria a Innovar?','required',true,'min',0,'max',10),
        jsonb_build_object('key','strengths','type','LONG_TEXT','label','O que mais gostou?','required',false),
        jsonb_build_object('key','improvements','type','LONG_TEXT','label','O que podemos melhorar?','required',false),
        jsonb_build_object('key','contact_permission','type','YES_NO','label','Autoriza contato para conversar sobre sua resposta?','required',true))))
    ) as defaults(code,schema_json)
  loop
    insert into public.quality_form_templates(organization_id,code,title,description,kind,scope,status,allow_attachments,allow_photos)
    values(
      p_organization_id,v_code,
      case v_code when 'FVS-PADRAO' then 'Ficha de Verificação de Serviço' when 'FVM-PADRAO' then 'Ficha de Verificação de Material' else 'Pesquisa de satisfação do cliente' end,
      case v_code when 'FVS-PADRAO' then 'Modelo inicial editável para inspeção de serviços.' when 'FVM-PADRAO' then 'Modelo inicial editável para recebimento e inspeção de materiais.' else 'Pesquisa simples de satisfação e recomendação.' end,
      (v_schema->>'kind')::public.quality_form_kind,
      case when v_code='PESQUISA-SATISFACAO' then 'CLIENT'::public.quality_form_scope else 'INTERNAL'::public.quality_form_scope end,
      'PUBLISHED',true,true
    ) on conflict(organization_id,code) do update set title=excluded.title
    returning id into v_template_id;

    select id into v_version_id from public.quality_form_versions where template_id=v_template_id order by version_number limit 1;
    if v_version_id is null then
      insert into public.quality_form_versions(organization_id,template_id,version_number,schema_json,presentation_json,change_summary,frozen_at)
      values(p_organization_id,v_template_id,1,v_schema,jsonb_build_object('theme','alpine','showProgress',true),'Modelo inicial da Etapa 13',now())
      returning id into v_version_id;
    end if;
    update public.quality_form_templates set current_version_id=v_version_id,status='PUBLISHED',updated_at=now() where id=v_template_id;
  end loop;
end $$;

create or replace function public.install_quality_defaults_after_organization()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.install_quality_default_templates(new.id);
  return new;
end $$;

drop trigger if exists organizations_install_quality_defaults on public.organizations;
create trigger organizations_install_quality_defaults
after insert on public.organizations
for each row execute function public.install_quality_defaults_after_organization();

select public.install_quality_default_templates(id) from public.organizations;

revoke all on function public.install_quality_default_templates(uuid) from public,anon,authenticated;
revoke all on function public.install_quality_defaults_after_organization() from public,anon,authenticated;
grant execute on function public.install_quality_default_templates(uuid) to service_role;
