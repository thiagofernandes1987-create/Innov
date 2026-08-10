do $$
declare
  v_count integer;
begin
  with fks as(
    select c.oid,c.conrelid,c.confrelid,c.conkey,c.confkey
    from pg_constraint c
    join pg_class child on child.oid=c.conrelid
    join pg_namespace child_ns on child_ns.oid=child.relnamespace
    join pg_class parent on parent.oid=c.confrelid
    join pg_namespace parent_ns on parent_ns.oid=parent.relnamespace
    where c.contype='f'
      and child_ns.nspname='public'
      and parent_ns.nspname='public'
      and child.relname like 'rh\_%' escape '\'
      and parent.relname like 'rh\_%' escape '\'
  ), redundant as(
    select f1.oid
    from fks f1
    join pg_attribute child_org on child_org.attrelid=f1.conrelid and child_org.attname='organization_id' and not child_org.attisdropped
    join pg_attribute parent_org on parent_org.attrelid=f1.confrelid and parent_org.attname='organization_id' and not parent_org.attisdropped
    where not(child_org.attnum::smallint=any(f1.conkey))
      and exists(
        select 1 from fks f2
        where f2.oid<>f1.oid
          and f2.conrelid=f1.conrelid
          and f2.confrelid=f1.confrelid
          and f2.conkey @> f1.conkey
          and f2.confkey @> f1.confkey
          and child_org.attnum::smallint=any(f2.conkey)
          and parent_org.attnum::smallint=any(f2.confkey)
      )
  )
  select count(*) into v_count from redundant;

  if v_count<>0 then
    raise exception 'Ainda existem % FKs RH simples redundantes cobertas por FK composta tenant-safe',v_count;
  end if;

  raise notice 'RH PostgREST FK — nenhuma FK simples redundante permaneceu.';
end$$;
