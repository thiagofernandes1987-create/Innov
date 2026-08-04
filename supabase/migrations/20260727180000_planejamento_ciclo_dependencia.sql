-- Planejamento — dependência sem ciclo, e o vocabulário em português.
-- Sprint S-24, tarefa T-24.9.
--
-- O esquema de dependência já existia desde a etapa 12 e está mais completo do
-- que a leitura inicial sugeria: `task_dependencies` tem os quatro tipos como
-- enum (`FS`, `SS`, `FF`, `SF`), `lag_days` para folga e defasagem, unicidade do
-- par e recusa de dependência de si mesmo. Os quatro tipos são exatamente os que
-- o responsável nomeou:
--
--   FS = Término-Início  (TI) — o clássico: só começa quando o anterior termina
--   SS = Início-Início   (II) — começam juntas, com folga opcional
--   FF = Término-Término (TT) — terminam juntas
--   SF = Início-Término  (IT) — o raro: só termina quando o outro começa
--
-- O que **não** existia é a única coisa que torna um cronograma incalculável:
-- **ciclo**. `A → B → C → A` passa por toda restrição atual — nenhuma delas
-- olha além do par imediato. E ciclo não é erro de digitação improvável: em
-- obra, "a fabricação depende da medição" e "a medição final depende da
-- fabricação" são duas frases que fazem sentido ditas separadamente.
--
-- Sem esta guarda, o cálculo de datas entra em recursão infinita ou devolve
-- número arbitrário, dependendo de onde o laço começa. Recusar na escrita é o
-- único lugar em que a recusa é barata.

-- ── Detecção de ciclo ───────────────────────────────────────────────────────

create or replace function public.task_dependency_cria_ciclo(
  p_predecessor uuid,
  p_successor uuid
) returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  -- Existe caminho que saia do sucessor e chegue no predecessor? Se existe,
  -- fechar esta aresta fecha o laço.
  with recursive alcance as (
    select successor_task_id as tarefa
      from public.task_dependencies
     where predecessor_task_id = p_successor
    union
    select d.successor_task_id
      from public.task_dependencies d
      join alcance a on a.tarefa = d.predecessor_task_id
  )
  select exists (select 1 from alcance where tarefa = p_predecessor);
$$;

comment on function public.task_dependency_cria_ciclo(uuid, uuid) is
  'Verdadeiro quando ligar predecessor→sucessor fecharia um ciclo no grafo de dependências.';

create or replace function public.task_dependency_sem_ciclo()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if public.task_dependency_cria_ciclo(new.predecessor_task_id, new.successor_task_id) then
    raise exception
      'Esta dependência fecharia um ciclo: a tarefa predecessora já depende, direta ou indiretamente, da sucessora.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists task_dependencies_sem_ciclo on public.task_dependencies;
create trigger task_dependencies_sem_ciclo
  before insert or update of predecessor_task_id, successor_task_id
  on public.task_dependencies
  for each row execute function public.task_dependency_sem_ciclo();

-- ── Coerência de projeto ────────────────────────────────────────────────────
-- Dependência entre tarefas de projetos diferentes não é cronograma: é engano.
-- A coluna `project_id` da dependência precisa bater com a das duas tarefas, e
-- isso é integridade referencial, não disciplina de quem escreve o INSERT.

create unique index if not exists project_tasks_id_project_uidx
  on public.project_tasks(id, project_id);

alter table public.task_dependencies
  drop constraint if exists task_dependencies_predecessor_mesmo_projeto;
alter table public.task_dependencies
  add constraint task_dependencies_predecessor_mesmo_projeto
  foreign key (predecessor_task_id, project_id)
  references public.project_tasks(id, project_id) on delete cascade;

alter table public.task_dependencies
  drop constraint if exists task_dependencies_sucessor_mesmo_projeto;
alter table public.task_dependencies
  add constraint task_dependencies_sucessor_mesmo_projeto
  foreign key (successor_task_id, project_id)
  references public.project_tasks(id, project_id) on delete cascade;

-- ── Verificação embutida ────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'task_dependencies_sem_ciclo'
      and tgrelid = 'public.task_dependencies'::regclass
  ) then
    raise exception 'Gatilho de ciclo não foi instalado em task_dependencies.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'task_dependencies_predecessor_mesmo_projeto'
      and conrelid = 'public.task_dependencies'::regclass
  ) then
    raise exception 'Chave composta de projeto do predecessor ausente.';
  end if;

  -- Os quatro tipos precisam continuar existindo: o cálculo de datas os
  -- referencia por nome, e um enum reduzido silenciosamente deixaria a tela
  -- oferecendo um tipo que o banco recusa.
  if (
    select count(*) from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'task_dependency_type'
      and e.enumlabel in ('FS','SS','FF','SF')
  ) <> 4 then
    raise exception 'O enum task_dependency_type não tem os quatro tipos.';
  end if;
end;
$$;
