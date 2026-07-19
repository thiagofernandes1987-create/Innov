begin;

create unique index if not exists signature_signers_envelope_email_order_uidx
  on public.signature_signers (envelope_id, lower(email), signing_order);

commit;
