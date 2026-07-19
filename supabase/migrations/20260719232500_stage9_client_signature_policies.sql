begin;

create policy signature_envelopes_client_select
on public.signature_envelopes for select
using (
  exists (
    select 1
    from public.contract_versions cv
    join public.contracts c on c.id = cv.contract_id
    where cv.id = signature_envelopes.contract_version_id
      and cv.client_released_at is not null
      and c.client_released_at is not null
      and public.is_client_owner(c.client_id)
  )
  or exists (
    select 1
    from public.amendment_versions av
    join public.amendments a on a.id = av.amendment_id
    join public.contracts c on c.id = a.contract_id
    where av.id = signature_envelopes.amendment_version_id
      and av.client_released_at is not null
      and a.client_released_at is not null
      and public.is_client_owner(c.client_id)
  )
);

create policy signature_signers_client_select
on public.signature_signers for select
using (
  exists (
    select 1 from public.signature_envelopes se
    where se.id = signature_signers.envelope_id
      and (
        exists (
          select 1 from public.contract_versions cv
          join public.contracts c on c.id=cv.contract_id
          where cv.id=se.contract_version_id
            and cv.client_released_at is not null
            and c.client_released_at is not null
            and public.is_client_owner(c.client_id)
        )
        or exists (
          select 1 from public.amendment_versions av
          join public.amendments a on a.id=av.amendment_id
          join public.contracts c on c.id=a.contract_id
          where av.id=se.amendment_version_id
            and av.client_released_at is not null
            and a.client_released_at is not null
            and public.is_client_owner(c.client_id)
        )
      )
  )
);

create policy signature_events_client_select
on public.signature_events for select
using (
  exists (
    select 1 from public.signature_envelopes se
    where se.id = signature_events.envelope_id
      and (
        exists (
          select 1 from public.contract_versions cv
          join public.contracts c on c.id=cv.contract_id
          where cv.id=se.contract_version_id
            and cv.client_released_at is not null
            and c.client_released_at is not null
            and public.is_client_owner(c.client_id)
        )
        or exists (
          select 1 from public.amendment_versions av
          join public.amendments a on a.id=av.amendment_id
          join public.contracts c on c.id=a.contract_id
          where av.id=se.amendment_version_id
            and av.client_released_at is not null
            and a.client_released_at is not null
            and public.is_client_owner(c.client_id)
        )
      )
  )
);

commit;
