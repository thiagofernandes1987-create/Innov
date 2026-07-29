-- VACINA-004 e VACINA-039: consulta e inclusão SINAPI executam sob a
-- identidade do usuário. As policies e guards do domínio são suficientes; não
-- existe justificativa para elevar essas duas RPCs ao proprietário da função.

alter function public.search_sinapi_references(
  uuid, text, text, text, date, boolean, integer
) security invoker;

alter function public.add_sinapi_reference_to_budget(
  uuid, text, uuid, numeric, uuid
) security invoker;
