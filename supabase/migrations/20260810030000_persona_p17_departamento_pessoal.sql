-- Persona P17 — departamento pessoal e folha, exigida pelo módulo `rh` (PR #42).
--
-- ## Por que uma migration, e não um seed
--
-- O catálogo de personas não vive só no TypeScript. A S-30 gravou o vocabulário
-- **no banco**, em seis restrições `check` que casam `^P([1-9]|1[0-6])$`. Isso
-- foi uma boa decisão — impede que um fato operacional nasça apontando para uma
-- persona que não existe — e tem o custo esperado: **persona nova é mudança de
-- esquema**. Sem esta migration, a P17 existiria no código e seria recusada pelo
-- banco na primeira gravação, que é o pior lugar para descobrir.
--
-- Foi o `tests/personas-db-contract.test.ts` que apontou, no mesmo instante em
-- que a P17 entrou no catálogo. O portão fez exatamente o trabalho dele.
--
-- ## Por que P99 e não P17
--
-- A faixa passa a `^P([1-9]|[1-9][0-9])$`. Fixar o teto na persona recém-criada
-- garantiria repetir esta migration na próxima — e o que a restrição precisa
-- impedir é `PX`, `P0` e texto livre, não a existência de uma décima oitava
-- profissão. O catálogo canônico continua sendo `lib/personas/catalog.ts`, e o
-- teste de contrato é quem amarra os dois.
--
-- VACINA-014: descoberta por nome, sem lista fixa.
begin;

-- As restrições da S-30 são anônimas, então o nome real é o gerado pelo
-- PostgreSQL. Descobrir pelo texto da definição é o que torna esta migration
-- aplicável sem depender de um nome que ninguém escolheu.
do $$
declare
  alvo record;
  contadas integer := 0;
begin
  for alvo in
    select rel.relname as tabela, con.conname as restricao,
           pg_get_constraintdef(con.oid) as definicao
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and con.contype = 'c'
      and rel.relname in (
        'operational_event_types',
        'operational_responsibilities',
        'operational_events',
        'operational_notifications'
      )
      and pg_get_constraintdef(con.oid) like '%1[0-6]%'
  loop
    execute format('alter table public.%I drop constraint %I', alvo.tabela, alvo.restricao);
    execute format('alter table public.%I add constraint %I check (%s)',
      alvo.tabela,
      alvo.restricao,
      replace(
        substring(alvo.definicao from position('(' in alvo.definicao) + 1 for
                  length(alvo.definicao) - position('(' in alvo.definicao) - 1),
        '1[0-6]', '[1-9][0-9]'
      )
    );
    contadas := contadas + 1;
  end loop;

  -- Zero significaria que a faixa não era onde eu pensava, e seguir adiante
  -- gravaria a P17 numa tabela que a recusa. Falha aqui é mais barata.
  if contadas <> 6 then
    raise exception 'Esperava 6 restrições de faixa de persona, encontrei %.', contadas;
  end if;
end;
$$;

insert into public.operational_event_types(
  event_code, actor_persona, default_recipient_personas
) values
  ('rh.esocial_ocorrencia_bloqueante', 'P17', array['P13','P16','P4'])
on conflict (event_code) do update
  set actor_persona = excluded.actor_persona,
      default_recipient_personas = excluded.default_recipient_personas;

commit;
