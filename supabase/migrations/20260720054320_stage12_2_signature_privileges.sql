-- Etapa 12.2 — privilégios explícitos das funções.

revoke all on function public.lock_signature_conversion_job(text)
from public,anon,authenticated;
revoke all on function public.complete_signature_conversion_job(uuid,text,text,integer)
from public,anon,authenticated;
revoke all on function public.fail_signature_conversion_job(uuid,text,interval)
from public,anon,authenticated;
revoke all on function public.record_advanced_signature_field_value(
  text,uuid,text,boolean,text,text,text,bigint,text,text,jsonb
) from public,anon,authenticated;
revoke all on function public.mark_advanced_signer_complete(text,text)
from public,anon,authenticated;
revoke all on function public.get_advanced_signing_context(text)
from public,anon,authenticated;
revoke all on function public.list_advanced_signer_fields(text)
from public,anon,authenticated;
revoke all on function public.complete_signature_copy_delivery(
  uuid,public.signature_delivery_status,text
) from public,anon,authenticated;

grant execute on function public.lock_signature_conversion_job(text)
to service_role;
grant execute on function public.complete_signature_conversion_job(uuid,text,text,integer)
to service_role;
grant execute on function public.fail_signature_conversion_job(uuid,text,interval)
to service_role;
grant execute on function public.record_advanced_signature_field_value(
  text,uuid,text,boolean,text,text,text,bigint,text,text,jsonb
) to service_role;
grant execute on function public.mark_advanced_signer_complete(text,text)
to service_role;
grant execute on function public.get_advanced_signing_context(text)
to service_role;
grant execute on function public.list_advanced_signer_fields(text)
to service_role;
grant execute on function public.complete_signature_copy_delivery(
  uuid,public.signature_delivery_status,text
) to service_role;

revoke all on function public.create_advanced_signature_document(
  uuid,uuid,uuid,text,text,public.signature_source_format,
  text,text,text,bigint,text,text,text,integer
) from public,anon;
revoke all on function public.create_advanced_signature_envelope(
  uuid,public.signature_provider,text,jsonb
) from public,anon;
revoke all on function public.add_advanced_signature_field(
  uuid,uuid,public.signature_field_type,integer,numeric,numeric,
  numeric,numeric,text,text,boolean,integer,jsonb
) from public,anon;
revoke all on function public.freeze_advanced_signature_layout(uuid)
from public,anon;
revoke all on function public.finalize_advanced_signature_envelope(
  uuid,text,text,text,text
) from public,anon;
revoke all on function public.queue_signature_copy_delivery(
  uuid,uuid,text,public.signature_delivery_channel
) from public,anon;

grant execute on function public.create_advanced_signature_document(
  uuid,uuid,uuid,text,text,public.signature_source_format,
  text,text,text,bigint,text,text,text,integer
) to authenticated,service_role;
grant execute on function public.create_advanced_signature_envelope(
  uuid,public.signature_provider,text,jsonb
) to authenticated,service_role;
grant execute on function public.add_advanced_signature_field(
  uuid,uuid,public.signature_field_type,integer,numeric,numeric,
  numeric,numeric,text,text,boolean,integer,jsonb
) to authenticated,service_role;
grant execute on function public.freeze_advanced_signature_layout(uuid)
to authenticated,service_role;
grant execute on function public.finalize_advanced_signature_envelope(
  uuid,text,text,text,text
) to authenticated,service_role;
grant execute on function public.queue_signature_copy_delivery(
  uuid,uuid,text,public.signature_delivery_channel
) to authenticated,service_role;
