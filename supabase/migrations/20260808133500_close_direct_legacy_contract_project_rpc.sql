begin;

-- A porta pública canônica é create_project_from_contract_v2. A auditoria no
-- banco ativo confirmou que a v2 implementa o fluxo completo sozinha: ela não
-- chama create_project_from_contract, e nenhum outro objeto possui referência
-- de corpo ou dependência de catálogo para o core antigo.
--
-- Antes do DROP, validamos novamente a premissa no próprio deploy. Se a v2
-- voltar a depender do core em uma alteração futura, a migration aborta em vez
-- de remover uma dependência necessária. O DROP usa RESTRICT implícito.
do $$
declare
  v_v2 oid;
  v_v2_definition text;
begin
  v_v2 := to_regprocedure(
    'public.create_project_from_contract_v2(uuid,text,text,date,date,text,text,text,text,text)'
  );

  if v_v2 is null then
    raise exception
      'create_project_from_contract_v2 ausente; não é seguro remover o core legado';
  end if;

  v_v2_definition := pg_get_functiondef(v_v2);
  if v_v2_definition ilike '%create_project_from_contract(%' then
    raise exception
      'create_project_from_contract_v2 voltou a depender do core legado; reclassifique antes do DROP';
  end if;
end;
$$;

drop function if exists public.create_project_from_contract(
  uuid, text, text, date, date, text, text, text
);

-- Declara explicitamente a única porta suportada, evitando depender de grant
-- herdado de PUBLIC em um replay novo.
revoke all on function public.create_project_from_contract_v2(
  uuid, text, text, date, date, text, text, text, text, text
) from public, anon;
grant execute on function public.create_project_from_contract_v2(
  uuid, text, text, date, date, text, text, text, text, text
) to authenticated;

commit;
