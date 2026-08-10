do $$
declare v_org uuid;v_user uuid;v_emp uuid;v_one uuid;v_two uuid;v_raised boolean;
begin
 insert into auth.users(email) values('rh-mit@innovar.local') returning id into v_user;
 insert into public.organizations(name) values('RH MIT teste') returning id into v_org;
 insert into public.organization_memberships(organization_id,user_id,role,active) values(v_org,v_user,'ADMIN',true);
 perform set_config('test.user_id',v_user::text,false);perform set_config('test.permission_granted','true',false);
 insert into public.rh_employers(organization_id,code,legal_name,tax_id,created_by) values(v_org,'MIT','Empresa MIT','12345678000199',v_user) returning id into v_emp;
 v_one:=public.create_rh_mit_apuration(v_org,v_emp,date '2026-08-01',true,1,null,null,null,null,'12345678900',null,null,null,null,null);
 if (select version from public.rh_mit_apurations where id=v_one)<>1 then raise exception 'MIT 1 falhou: versão inicial';end if;
 v_two:=public.create_rh_mit_apuration(v_org,v_emp,date '2026-08-01',false,1,3,2,null,false,'12345678900','12','999999999','resp@example.com','SP','123456');
 if (select version from public.rh_mit_apurations where id=v_two)<>2 then raise exception 'MIT 2 falhou: nova versão';end if;
 if (select status from public.rh_mit_apurations where id=v_one)<>'SUPERSEDED' then raise exception 'MIT 2 falhou: versão anterior não superada';end if;
 insert into public.rh_mit_debts(organization_id,apuration_id,group_code,debt_id,revenue_code,amount,created_by) values(v_org,v_two,'ContribuicoesDiversas',1,'123456',777.55,v_user);
 if (select amount from public.rh_mit_debts where apuration_id=v_two and debt_id=1)<>777.55 then raise exception 'MIT 3 falhou: débito não persistido';end if;
 v_raised:=false;begin perform public.create_rh_mit_apuration(v_org,v_emp,date '2026-09-01',false,1,3,null,null,false,'12345678900',null,null,null,null,null);exception when others then if sqlerrm like '%Variações monetárias%' then v_raised:=true;end if;end;if not v_raised then raise exception 'MIT 4 falhou: movimento sem variações foi aceito';end if;
 raise notice 'RH MIT — versionamento, débito e invariantes aprovados.';
end$$;
