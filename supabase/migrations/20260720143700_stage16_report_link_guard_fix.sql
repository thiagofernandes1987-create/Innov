-- Etapa 16 — corrige o acesso a campos opcionais no validador multi-tabela.

create or replace function public.validate_report_links()
returns trigger language plpgsql set search_path=public as $$
declare
  v_row jsonb;
  v_organization_id uuid;
  v_project_id uuid;
  v_saved_view_id uuid;
  v_snapshot_id uuid;
  v_related_org uuid;
  v_related_project uuid;
begin
  v_row:=to_jsonb(new);
  v_organization_id:=nullif(v_row->>'organization_id','')::uuid;
  v_project_id:=nullif(v_row->>'project_id','')::uuid;
  v_saved_view_id:=nullif(v_row->>'saved_view_id','')::uuid;
  v_snapshot_id:=nullif(v_row->>'snapshot_id','')::uuid;

  if v_project_id is not null then
    select organization_id into v_related_org from public.projects where id=v_project_id;
    if v_related_org is null or v_related_org<>v_organization_id then
      raise exception 'A obra não pertence à organização do relatório.';
    end if;
  end if;

  if v_saved_view_id is not null then
    select organization_id,project_id into v_related_org,v_related_project from public.report_saved_views where id=v_saved_view_id;
    if v_related_org is null or v_related_org<>v_organization_id
       or (v_project_id is not null and v_related_project is not null and v_related_project<>v_project_id) then
      raise exception 'O relatório salvo é incompatível com organização ou obra.';
    end if;
  end if;

  if v_snapshot_id is not null then
    select organization_id,project_id into v_related_org,v_related_project from public.report_snapshots where id=v_snapshot_id;
    if v_related_org is null or v_related_org<>v_organization_id
       or (v_project_id is not null and v_related_project is not null and v_related_project<>v_project_id) then
      raise exception 'O snapshot é incompatível com organização ou obra.';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.validate_report_links() from public,anon,authenticated;
