-- Remove somente FKs RH->RH simples que são estritamente redundantes com
-- uma FK composta equivalente contendo organization_id nos dois lados.
-- A FK composta é mais forte: preserva integridade referencial e isolamento tenant.
do $$
declare
  r record;
  child_org_attnum smallint;
  parent_org_attnum smallint;
begin
  for r in
    select
      c.oid,
      c.conname,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      child_ns.nspname as child_schema,
      child.relname as child_table,
      parent.relname as parent_table
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
    order by child.relname,c.conname
  loop
    select attnum::smallint into child_org_attnum
    from pg_attribute
    where attrelid=r.conrelid and attname='organization_id' and not attisdropped;

    select attnum::smallint into parent_org_attnum
    from pg_attribute
    where attrelid=r.confrelid and attname='organization_id' and not attisdropped;

    if child_org_attnum is null or parent_org_attnum is null then
      continue;
    end if;

    -- Se a própria FK já contém organization_id, ela é a relação forte e fica.
    if child_org_attnum = any(r.conkey) then
      continue;
    end if;

    if exists(
      select 1
      from pg_constraint c2
      where c2.contype='f'
        and c2.oid<>r.oid
        and c2.conrelid=r.conrelid
        and c2.confrelid=r.confrelid
        and c2.conkey @> r.conkey
        and c2.confkey @> r.confkey
        and child_org_attnum = any(c2.conkey)
        and parent_org_attnum = any(c2.confkey)
    ) then
      execute format('alter table %I.%I drop constraint %I',r.child_schema,r.child_table,r.conname);
      raise notice 'RH PostgREST: removida FK redundante %.% -> % (%)',r.child_schema,r.child_table,r.parent_table,r.conname;
    end if;
  end loop;
end$$;
