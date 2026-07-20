-- Etapa 15 — baixa e metadados do comprovante na mesma transação.

create or replace function public.register_finance_settlement_with_attachment(
 p_installment_id uuid,
 p_amount numeric,
 p_settled_at timestamptz,
 p_method public.finance_settlement_method,
 p_cash_account_id uuid default null,
 p_reference text default null,
 p_notes text default '',
 p_file_name text default null,
 p_mime_type text default null,
 p_size_bytes bigint default null,
 p_storage_path text default null,
 p_sha256 text default null
) returns public.finance_settlements
language plpgsql security definer set search_path=public as $$
declare v public.finance_settlements;
begin
 v:=public.register_finance_settlement(
  p_installment_id,p_amount,p_settled_at,p_method,p_cash_account_id,p_reference,p_notes
 );
 if p_file_name is not null or p_storage_path is not null then
  if p_file_name is null or p_mime_type is null or p_size_bytes is null
     or p_storage_path is null or p_sha256 is null then
   raise exception 'Metadados incompletos do comprovante.';
  end if;
  if p_size_bytes<=0 or p_size_bytes>26214400 then raise exception 'Comprovante superior a 25 MB ou vazio.'; end if;
  if p_mime_type not in (
   'application/pdf','image/png','image/jpeg','image/webp',
   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) then raise exception 'Tipo de comprovante não permitido.'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Hash inválido do comprovante.'; end if;
  if p_storage_path not like v.organization_id::text||'/settlements/%' then
   raise exception 'Caminho inválido do comprovante.';
  end if;
  insert into public.finance_attachments(
   organization_id,settlement_id,file_name,mime_type,size_bytes,storage_path,sha256,created_by
  ) values(
   v.organization_id,v.id,p_file_name,p_mime_type,p_size_bytes,p_storage_path,p_sha256,auth.uid()
  );
 end if;
 return v;
end $$;

revoke all on function public.register_finance_settlement_with_attachment(
 uuid,numeric,timestamptz,public.finance_settlement_method,uuid,text,text,text,text,bigint,text,text
) from public,anon;
grant execute on function public.register_finance_settlement_with_attachment(
 uuid,numeric,timestamptz,public.finance_settlement_method,uuid,text,text,text,text,bigint,text,text
) to authenticated,service_role;
