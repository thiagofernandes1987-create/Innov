import "server-only";
import { requireOrganizationContext } from "@/lib/auth";
import type { Dependencia, TarefaCronograma, TipoDependencia } from "./cronograma";

// Leitura do cronograma de um projeto.
//
// Duas consultas, sem embed aninhado: `task_dependencies` tem duas chaves
// estrangeiras para `project_tasks` — predecessora e sucessora —, e o PostgREST
// responde a isso com o mesmo erro de embed ambíguo que vaza na tela de
// Documentos (defeito D2).

export type ProjetoDoCronograma = {
  id: string;
  code: string;
  name: string;
  clientId: string | null;
  cliente: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
};

export type CronogramaCarregado = {
  projeto: ProjetoDoCronograma;
  tarefas: TarefaCronograma[];
  dependencias: Dependencia[];
};

export async function carregarCronograma(projectId: string): Promise<CronogramaCarregado | null> {
  const { supabase } = await requireOrganizationContext();

  const { data: projeto } = await supabase
    .from("projects")
    .select("id,code,name,client_id,planned_start,planned_end")
    .eq("id", projectId)
    .maybeSingle();
  if (!projeto) return null;

  const [tarefasResultado, dependenciasResultado, clienteResultado] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id,title,duration_days,planned_start,planned_end,progress,sequence")
      .eq("project_id", projectId)
      .order("sequence", { ascending: true })
      .limit(500),
    supabase
      .from("task_dependencies")
      .select("predecessor_task_id,successor_task_id,dependency_type,lag_days")
      .eq("project_id", projectId)
      .limit(1000),
    projeto.client_id
      ? supabase.from("clients").select("legal_name,trade_name").eq("id", projeto.client_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const tarefas: TarefaCronograma[] = (
    (tarefasResultado.data ?? []) as {
      id: string;
      title: string;
      duration_days: string | number;
      planned_start: string | null;
      planned_end: string | null;
      progress: string | number;
    }[]
  ).map(linha => ({
    id: linha.id,
    titulo: linha.title,
    duracaoDias: Number(linha.duration_days) || 1,
    inicioPlanejado: linha.planned_start,
    terminoPlanejado: linha.planned_end,
    progresso: Number(linha.progress) || 0
  }));

  const dependencias: Dependencia[] = (
    (dependenciasResultado.data ?? []) as {
      predecessor_task_id: string;
      successor_task_id: string;
      dependency_type: string;
      lag_days: string | number;
    }[]
  ).map(linha => ({
    predecessorId: linha.predecessor_task_id,
    sucessorId: linha.successor_task_id,
    tipo: linha.dependency_type as TipoDependencia,
    folgaDias: Number(linha.lag_days) || 0
  }));

  const cliente = clienteResultado.data as { legal_name: string; trade_name: string | null } | null;

  return {
    projeto: {
      id: projeto.id,
      code: projeto.code,
      name: projeto.name,
      clientId: projeto.client_id,
      cliente: cliente ? cliente.trade_name?.trim() || cliente.legal_name : null,
      plannedStart: projeto.planned_start,
      plannedEnd: projeto.planned_end
    },
    tarefas,
    dependencias
  };
}

/**
 * A lista do planejamento, por cliente — a T-24.8 do inventário.
 *
 * É a visão que o responsável enumerou coluna por coluna: início da obra,
 * término previsto, etapa atual, % concluída e situação do prazo. O progresso
 * do projeto é a média das tarefas ponderada pela duração — tarefa de dez dias
 * pesa dez vezes mais que a de um, e a média simples faria uma tarefa curta
 * concluída parecer metade da obra.
 */
export type LinhaDoPlanejamento = {
  id: string;
  code: string;
  name: string;
  cliente: string | null;
  inicio: string | null;
  terminoPrevisto: string | null;
  tarefas: number;
  concluidoPct: number;
  atrasadas: number;
};

export async function listaDoPlanejamento(): Promise<LinhaDoPlanejamento[]> {
  const { supabase, organizationId } = await requireOrganizationContext();

  const { data: projetos } = await supabase
    .from("projects")
    .select("id,code,name,client_id,planned_start,planned_end")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("code", { ascending: true })
    .limit(200);

  const linhas = (projetos ?? []) as {
    id: string;
    code: string;
    name: string;
    client_id: string | null;
    planned_start: string | null;
    planned_end: string | null;
  }[];
  if (linhas.length === 0) return [];

  const idsCliente = [...new Set(linhas.map(l => l.client_id).filter((id): id is string => Boolean(id)))];
  const [tarefasResultado, clientesResultado] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("project_id,duration_days,progress,planned_end")
      .in("project_id", linhas.map(l => l.id))
      .limit(5000),
    idsCliente.length
      ? supabase.from("clients").select("id,legal_name,trade_name").in("id", idsCliente)
      : Promise.resolve({ data: [] })
  ]);

  const nomePorCliente = new Map(
    ((clientesResultado.data ?? []) as { id: string; legal_name: string; trade_name: string | null }[]).map(l => [
      l.id,
      l.trade_name?.trim() || l.legal_name
    ])
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const porProjeto = new Map<string, { peso: number; feito: number; total: number; atrasadas: number }>();
  for (const t of (tarefasResultado.data ?? []) as {
    project_id: string;
    duration_days: string | number;
    progress: string | number;
    planned_end: string | null;
  }[]) {
    const atual = porProjeto.get(t.project_id) ?? { peso: 0, feito: 0, total: 0, atrasadas: 0 };
    const peso = Math.max(1, Number(t.duration_days) || 1);
    const progresso = Number(t.progress) || 0;
    atual.peso += peso;
    atual.feito += peso * progresso;
    atual.total += 1;
    if (t.planned_end && t.planned_end < hoje && progresso < 1) atual.atrasadas += 1;
    porProjeto.set(t.project_id, atual);
  }

  return linhas.map(linha => {
    const soma = porProjeto.get(linha.id);
    return {
      id: linha.id,
      code: linha.code,
      name: linha.name,
      cliente: linha.client_id ? (nomePorCliente.get(linha.client_id) ?? null) : null,
      inicio: linha.planned_start,
      terminoPrevisto: linha.planned_end,
      tarefas: soma?.total ?? 0,
      concluidoPct: soma && soma.peso > 0 ? Math.round((soma.feito / soma.peso) * 100) : 0,
      atrasadas: soma?.atrasadas ?? 0
    };
  });
}
