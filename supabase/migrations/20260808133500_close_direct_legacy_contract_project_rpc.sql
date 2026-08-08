begin;

-- create_project_from_contract_v2 é a porta pública canônica: valida bairro/CEP,
-- aplica as invariantes atuais e chama create_project_from_contract como núcleo
-- interno. O núcleo continuava executável diretamente por authenticated, o que
-- permitia contornar a camada v2 mesmo sem nenhuma UI atual apontar para ele.
--
-- Mantemos a função porque v2 depende dela; fechamos somente a superfície RPC
-- direta. A função v2 é SECURITY DEFINER e continua podendo invocar o núcleo
-- com os privilégios do proprietário.
revoke all on function public.create_project_from_contract(
  uuid, text, text, date, date, text, text, text
) from public, anon, authenticated;

-- Declara explicitamente a porta suportada, evitando depender de privilégio
-- herdado de PUBLIC em um replay novo.
revoke all on function public.create_project_from_contract_v2(
  uuid, text, text, date, date, text, text, text, text, text
) from public, anon;
grant execute on function public.create_project_from_contract_v2(
  uuid, text, text, date, date, text, text, text, text, text
) to authenticated;

commit;
