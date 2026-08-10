-- Dados no formato anterior à W-04 para provar backfill sem perda histórica.

insert into public.organizations(id,name) values
  ('11111111-1111-1111-1111-111111111111','Organização Um'),
  ('22222222-2222-2222-2222-222222222222','Organização Dois');

insert into auth.users(id,email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','tester@example.com');

insert into public.whatsapp_accounts(
  id,organization_id,waba_id,phone_number_id,business_name,created_by
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'waba-1','phone-1','Conta Um',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'waba-2','phone-2','Conta Dois',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  );

insert into public.whatsapp_contacts(
  id,organization_id,account_id,wa_id,phone_e164,display_name
) values
  (
    '11000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '5511999990001','+5511999990001','Contato Um'
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '20000000-0000-0000-0000-000000000002',
    '5511999990002','+5511999990002','Contato Dois'
  );

insert into public.whatsapp_conversations(
  id,organization_id,account_id,contact_id,last_customer_message_at
) values
  (
    '12000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',now()
  ),
  (
    '23000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '20000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000002',now()
  );

insert into public.whatsapp_messages(
  id,organization_id,conversation_id,direction,message_type,status,
  provider_message_id,idempotency_key,body
) values (
  '13000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '12000000-0000-0000-0000-000000000001',
  'OUTBOUND','TEXT','SENT','provider-message-shared','legacy-1','Histórico legado'
);

insert into public.whatsapp_webhook_events(
  id,organization_id,account_id,payload_sha256
) values (
  '14000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '10000000-0000-0000-0000-000000000001',
  repeat('a',64)
);
