do $$
declare
 v_org uuid;v_user uuid;v_emp uuid;v_worker uuid;v_benefit uuid;v_enrollment uuid;v_charge uuid;v_invoice uuid;v_doc uuid;v_version uuid;
 v_matched integer;v_divergent integer;v_missing integer;v_diff numeric;v_docs integer;v_auth integer;v_self boolean;
begin
 insert into auth.users(email) values('rh-benefit-doc@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH benefício/documento teste') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);

 v_emp:=public.create_rh_worker(v_org,'Trabalhador Benefício Documento',null,'32165498700','1992-04-10',null,null,'BDOC','BDOC-001','EMPLOYEE','2026-01-01',4500);
 select worker_id into v_worker from public.rh_employments where id=v_emp;

 insert into public.rh_benefit_catalog(organization_id,code,name,benefit_type,provider_name,employee_share_type,employee_share_value,created_by)
 values(v_org,'SAUDE','Plano Saúde','HEALTH','Operadora Teste','FIXED',100,v_user) returning id into v_benefit;
 insert into public.rh_benefit_enrollments(organization_id,employment_id,benefit_id,valid_from,status,created_by)
 values(v_org,v_emp,v_benefit,'2026-01-01','ACTIVE',v_user) returning id into v_enrollment;
 insert into public.rh_benefit_charges(organization_id,enrollment_id,reference_month,provider_amount,employer_amount,employee_amount,copay_amount,status,created_by)
 values(v_org,v_enrollment,'2026-08-01',500,400,80,20,'VALIDATED',v_user) returning id into v_charge;
 insert into public.rh_benefit_provider_invoices(organization_id,provider_name,reference_month,external_invoice_number,total_amount,status,created_by)
 values(v_org,'Operadora Teste','2026-08-01','NF-001',500,'IMPORTED',v_user) returning id into v_invoice;
 insert into public.rh_benefit_provider_invoice_items(organization_id,invoice_id,enrollment_id,external_worker_reference,billed_total,billed_employee_amount)
 values(v_org,v_invoice,v_enrollment,'BDOC-001',500,100);
 select matched,divergent,missing_internal,total_difference into v_matched,v_divergent,v_missing,v_diff from public.reconcile_rh_benefit_provider_invoice(v_invoice);
 if v_matched<>1 or v_divergent<>0 or v_missing<>0 or abs(v_diff)>0.01 then raise exception 'BENEFIT 1 falhou: reconciliação idêntica incorreta';end if;
 if (select status from public.rh_benefit_provider_invoices where id=v_invoice)<>'RECONCILED' then raise exception 'BENEFIT 2 falhou: fatura não reconciliada';end if;
 if (select charge_id from public.rh_benefit_provider_invoice_items where invoice_id=v_invoice)<>v_charge then raise exception 'BENEFIT 3 falhou: cobrança interna não vinculada';end if;

 insert into public.rh_documents(organization_id,worker_id,employment_id,category,title,description,sensitivity,status,visible_to_worker,created_by)
 values(v_org,v_worker,v_emp,'PAYROLL','Comunicado ao trabalhador','Documento de teste','STANDARD','DRAFT',false,v_user) returning id into v_doc;
 insert into public.rh_document_versions(organization_id,document_id,version,status,original_name,mime_type,byte_size,sha256,storage_path,uploaded_by)
 values(v_org,v_doc,1,'ACTIVE','comunicado.pdf','application/pdf',1024,repeat('a',64),v_org::text||'/'||v_worker::text||'/comunicado-v1.pdf',v_user) returning id into v_version;
 insert into public.rh_worker_user_links(organization_id,worker_id,user_id,active,valid_from,created_by)
 values(v_org,v_worker,v_user,true,current_date,v_user);
 perform public.publish_rh_document_version(v_version,true);
 if (select status from public.rh_document_versions where id=v_version)<>'PUBLISHED' then raise exception 'DOC 1 falhou: versão não publicada';end if;
 if not (select visible_to_worker from public.rh_documents where id=v_doc) then raise exception 'DOC 2 falhou: documento não visível ao trabalhador';end if;

 perform set_config('test.permission_granted','false',false);
 select count(*) into v_docs from public.get_my_rh_documents() where document_id=v_doc and version_id=v_version;
 if v_docs<>1 then raise exception 'DOC 3 falhou: Meu RH não retornou documento publicado';end if;
 select count(*),bool_or(worker_self_service) into v_auth,v_self from public.authorize_rh_document_download(v_version);
 if v_auth<>1 or not coalesce(v_self,false) then raise exception 'DOC 4 falhou: autorização self-service não concedida';end if;
 if not exists(select 1 from public.rh_document_access_log where document_version_id=v_version and actor_user_id=v_user and worker_self_service and access_kind='SIGNED_URL') then raise exception 'DOC 5 falhou: acesso não auditado';end if;

 raise notice 'RH benefícios/documentos — reconciliação e Meu RH aprovados.';
end$$;
