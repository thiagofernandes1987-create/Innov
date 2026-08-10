-- S-2300: ampliar a vertical TSVE para categorias de contribuinte individual
-- que compartilham o mesmo núcleo estrutural no leiaute S-1.3.

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_category_code_check;

alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_category_code_check
  check (category_code in ('701','711','712','721','722','723','731','734','738','741','751','761','771','781'));

alter table public.rh_tsv_esocial_profiles
  alter column fgts_option_date drop not null;

alter table public.rh_tsv_esocial_profiles
  drop constraint if exists rh_tsv_esocial_profiles_fgts_shape_check;
alter table public.rh_tsv_esocial_profiles
  add constraint rh_tsv_esocial_profiles_fgts_shape_check check (
    (category_code='721' and fgts_option_date is not null)
    or (category_code<>'721' and fgts_option_date is null)
  );

comment on table public.rh_tsv_esocial_profiles is
  'Perfil complementar S-2300 para categorias 7XX de contribuinte individual suportadas. Grupos próprios de avulso, dirigente sindical, cedido, mandato eletivo, estágio e serviço civil permanecem em verticais específicas futuras.';
