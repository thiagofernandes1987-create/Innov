"use client";

import {
  CaretDown,
  CaretRight,
  CalendarBlank,
  Crosshair,
  LinkSimple,
  Plus,
  X
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import {
  createScheduleDependency,
  createScheduleTask,
  createScheduleWbs,
  deleteScheduleDependency,
  updateScheduleTask
} from "@/app/actions/schedule";
import {
  calcular,
  cadeiaMaisLonga,
  ROTULO_DEPENDENCIA,
  SIGLA_PT,
  type BarraCronograma,
  type Dependencia,
  type TipoDependencia
} from "@/lib/planejamento/cronograma";
import { feriadosNaFaixa, regimePorChave } from "@/lib/planejamento/calendario";
import styles from "./schedule-planner.module.css";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import { modeloPara, type ModeloDeEtapa } from "@/lib/planejamento/modelos-de-eap";
import type { ValorDoCatalogo } from "@/lib/sugestoes/catalogo";

const DAY = 86_400_000;
const ROW_HEIGHT = 44;

export type PlannerWbs = {
  id: string;
  parentId: string | null;
  code: string;
  title: string;
  sequence: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  progress: number;
};

export type PlannerTask = {
  id: string;
  wbsId: string | null;
  parentTaskId: string | null;
  code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sequence: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  durationDays: number;
  progress: number;
};

export type PlannerDependency = {
  id: string;
  predecessorId: string;
  successorId: string;
  type: TipoDependencia;
  lagDays: number;
};

type PlannerRow =
  | {
      kind: "wbs";
      key: string;
      depth: number;
      wbs: PlannerWbs;
      taskIds: string[];
      hasChildren: boolean;
    }
  | {
      kind: "task";
      key: string;
      depth: number;
      task: PlannerTask;
    };

type ZoomMode = "day" | "week" | "month";
type EditorTab = "general" | "dependencies";

function toDay(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
}

function dateFromDay(day: number): Date {
  return new Date(day * DAY);
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = dateFromDay(toDay(iso));
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function sortBySequence<T extends { sequence: number; code: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code, "pt-BR"));
}

function buildRows(wbsItems: PlannerWbs[], tasks: PlannerTask[], collapsed: Set<string>): PlannerRow[] {
  const rows: PlannerRow[] = [];
  const wbsById = new Map(wbsItems.map(item => [item.id, item]));
  const childrenByParent = new Map<string | null, PlannerWbs[]>();
  const tasksByWbs = new Map<string | null, PlannerTask[]>();

  for (const item of wbsItems) {
    const parent = item.parentId && wbsById.has(item.parentId) ? item.parentId : null;
    const list = childrenByParent.get(parent) ?? [];
    list.push(item);
    childrenByParent.set(parent, list);
  }

  for (const task of tasks) {
    const wbsId = task.wbsId && wbsById.has(task.wbsId) ? task.wbsId : null;
    const list = tasksByWbs.get(wbsId) ?? [];
    list.push(task);
    tasksByWbs.set(wbsId, list);
  }

  const taskIdsCache = new Map<string, string[]>();
  const collecting = new Set<string>();

  function collectTaskIds(wbsId: string): string[] {
    const cached = taskIdsCache.get(wbsId);
    if (cached) return cached;
    if (collecting.has(wbsId)) return [];
    collecting.add(wbsId);
    const own = (tasksByWbs.get(wbsId) ?? []).map(task => task.id);
    const nested = (childrenByParent.get(wbsId) ?? []).flatMap(child => collectTaskIds(child.id));
    const result = [...own, ...nested];
    taskIdsCache.set(wbsId, result);
    collecting.delete(wbsId);
    return result;
  }

  function appendTasks(group: PlannerTask[], depth: number): void {
    const byId = new Set(group.map(task => task.id));
    const byParent = new Map<string | null, PlannerTask[]>();
    for (const task of group) {
      const parent = task.parentTaskId && byId.has(task.parentTaskId) ? task.parentTaskId : null;
      const list = byParent.get(parent) ?? [];
      list.push(task);
      byParent.set(parent, list);
    }

    const visited = new Set<string>();
    function visit(parentId: string | null, currentDepth: number): void {
      for (const task of sortBySequence(byParent.get(parentId) ?? [])) {
        if (visited.has(task.id)) continue;
        visited.add(task.id);
        rows.push({ kind: "task", key: `task-${task.id}`, depth: currentDepth, task });
        visit(task.id, currentDepth + 1);
      }
    }
    visit(null, depth);
    for (const task of sortBySequence(group)) {
      if (!visited.has(task.id)) rows.push({ kind: "task", key: `task-${task.id}`, depth, task });
    }
  }

  const visitedWbs = new Set<string>();
  function appendWbs(parentId: string | null, depth: number): void {
    for (const item of sortBySequence(childrenByParent.get(parentId) ?? [])) {
      if (visitedWbs.has(item.id)) continue;
      visitedWbs.add(item.id);
      const ownTasks = tasksByWbs.get(item.id) ?? [];
      const childWbs = childrenByParent.get(item.id) ?? [];
      rows.push({
        kind: "wbs",
        key: `wbs-${item.id}`,
        depth,
        wbs: item,
        taskIds: collectTaskIds(item.id),
        hasChildren: ownTasks.length > 0 || childWbs.length > 0
      });
      if (!collapsed.has(item.id)) {
        appendTasks(ownTasks, depth + 1);
        appendWbs(item.id, depth + 1);
      }
    }
  }

  appendWbs(null, 0);
  appendTasks(tasksByWbs.get(null) ?? [], 0);

  return rows;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  small = false,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={`${styles.modal} ${small ? styles.small : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <strong>{title}</strong>
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

/**
 * O conjunto que costuma vir com esta etapa.
 *
 * Aparece **só quando o nome digitado tem modelo**, e todas as atividades vêm
 * marcadas. Vir marcado é a diferença entre a oferta valer e não valer: quem
 * digitou "Fundação" pela terceira vez quer as cinco, e obrigá-lo a marcar
 * cinco caixas devolveria o trabalho que o recurso existe para tirar. Desmarcar
 * uma é um clique; marcar cinco são cinco.
 *
 * E é oferta, não imposição: desmarcar todas cria a etapa vazia, como sempre.
 */
function ModeloDeEtapaSugerido({ modelo }: { modelo: ModeloDeEtapa }) {
  const [aberto, setAberto] = useState(true);
  return (
    <div className="modelo-de-etapa">
      <div className="modelo-de-etapa-cabecalho">
        <strong>
          Esta etapa já foi montada {modelo.vezes} vezes, sempre com{" "}
          {modelo.atividades.length === 1 ? "1 atividade" : `${modelo.atividades.length} atividades`}
        </strong>
        <button type="button" className="modelo-de-etapa-alternar" onClick={() => setAberto(a => !a)}>
          {aberto ? "Ocultar" : "Ver"}
        </button>
      </div>
      {aberto ? (
        <>
          <ul className="modelo-de-etapa-lista">
            {modelo.atividades.map(atividade => (
              <li key={atividade.titulo}>
                <label className="modelo-de-etapa-item">
                  <input type="checkbox" name="atividadeDoModelo" value={atividade.titulo} defaultChecked />
                  <span>{atividade.titulo}</span>
                  <small>{atividade.ocorrencias} de {modelo.vezes}</small>
                </label>
              </li>
            ))}
          </ul>
          <p className="modelo-de-etapa-nota">
            Desmarque o que não se aplica a esta obra. Nada é criado sem marcação.
          </p>
        </>
      ) : null}
    </div>
  );
}

export function SchedulePlanner({
  projectId,
  projectStart,
  projectEnd,
  projectProgress,
  wbsItems,
  tasks,
  dependencies,
  today,
  regime = "seg_sex",
  sugestoesDeEtapa = [],
  modelosDeEap = [],
  sugestoesDeAtividade = []
}: {
  projectId: string;
  projectStart: string | null;
  projectEnd: string | null;
  projectProgress: number;
  wbsItems: PlannerWbs[];
  tasks: PlannerTask[];
  dependencies: PlannerDependency[];
  today: string;
  regime?: string;
  /** Vocabulário da organização: o que já foi digitado em outras obras. */
  sugestoesDeEtapa?: ValorDoCatalogo[];
  /** Modelos que emergem do histórico de EAP da organização. */
  modelosDeEap?: ModeloDeEtapa[];
  sugestoesDeAtividade?: ValorDoCatalogo[];
}) {
  const [zoom, setZoom] = useState<ZoomMode>("day");
  const [criticalVisible, setCriticalVisible] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creationModal, setCreationModal] = useState<"wbs" | "task" | null>(null);
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const timelineScrollerRef = useRef<HTMLDivElement>(null);

  const dayWidth = zoom === "day" ? 28 : zoom === "week" ? 12 : 5;
  const taskById = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const selectedTask = editorTaskId ? taskById.get(editorTaskId) ?? null : null;

  // Volta para a aba "geral" quando o editor troca de tarefa.
  //
  // Ajuste **durante a renderização**, não em `useEffect`: o efeito rodava
  // depois da pintura, então a aba antiga aparecia por um quadro na tarefa
  // nova, e o lint reprova por renderização em cascata. O padrão do React para
  // estado derivado de prop é comparar com o valor anterior guardado em estado.
  const [tarefaDoEditor, setTarefaDoEditor] = useState<string | null>(editorTaskId);
  if (tarefaDoEditor !== editorTaskId) {
    setTarefaDoEditor(editorTaskId);
    setEditorTab("general");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreationModal(null);
        setEditorTaskId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // O nome digitado precisa ser observável para achar o modelo: o campo com
  // sugestão passa a ser controlado só por isso.
  const [tituloDaEtapa, setTituloDaEtapa] = useState("");
  const modeloDaEtapa = useMemo(
    () => modeloPara(modelosDeEap, tituloDaEtapa),
    [modelosDeEap, tituloDaEtapa]
  );

  const rows = useMemo(() => buildRows(wbsItems, tasks, collapsed), [wbsItems, tasks, collapsed]);
  const calculationDependencies = useMemo<Dependencia[]>(
    () => dependencies.map(dependency => ({
      predecessorId: dependency.predecessorId,
      sucessorId: dependency.successorId,
      tipo: dependency.type,
      folgaDias: dependency.lagDays
    })),
    [dependencies]
  );

  const calendar = useMemo(() => {
    const declaredDates = tasks
      .flatMap(task => [task.plannedStart, task.plannedEnd])
      .filter((value): value is string => Boolean(value))
      .sort();
    const from = declaredDates[0] ?? projectStart ?? today;
    const to = declaredDates.at(-1) ?? projectEnd ?? `${Number(today.slice(0, 4)) + 2}-12-31`;
    return { regime: regimePorChave(regime), feriados: feriadosNaFaixa(from, to, []) };
  }, [tasks, projectStart, projectEnd, today, regime]);

  const { bars, cycle } = useMemo(() => {
    const result = calcular(
      tasks.map(task => ({
        id: task.id,
        titulo: `${task.code} · ${task.title}`,
        duracaoDias: task.durationDays,
        inicioPlanejado: task.plannedStart,
        terminoPlanejado: task.plannedEnd,
        progresso: task.progress
      })),
      calculationDependencies,
      calendar
    );
    return { bars: result.barras, cycle: result.ciclo };
  }, [tasks, calculationDependencies, calendar]);

  const barById = useMemo(() => new Map(bars.map(bar => [bar.id, bar])), [bars]);
  const critical = useMemo(
    () => (criticalVisible ? cadeiaMaisLonga(bars, calculationDependencies) : new Set<string>()),
    [bars, calculationDependencies, criticalVisible]
  );

  const range = useMemo(() => {
    const candidatesStart = [today, projectStart, ...bars.map(bar => bar.inicio)].filter((value): value is string => Boolean(value));
    const candidatesEnd = [today, projectEnd, ...bars.map(bar => bar.termino)].filter((value): value is string => Boolean(value));
    const first = Math.min(...candidatesStart.map(toDay));
    const last = Math.max(...candidatesEnd.map(toDay));
    return { start: first - 3, end: last + 7 };
  }, [bars, projectStart, projectEnd, today]);

  const days = useMemo(
    () => Array.from({ length: Math.max(1, range.end - range.start + 1) }, (_, index) => range.start + index),
    [range]
  );
  const timelineWidth = days.length * dayWidth;

  const months = useMemo(() => {
    const groups: { key: string; label: string; count: number }[] = [];
    for (const day of days) {
      const date = dateFromDay(day);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const label = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }).format(date);
      const last = groups.at(-1);
      if (last?.key === key) last.count += 1;
      else groups.push({ key, label, count: 1 });
    }
    return groups;
  }, [days]);

  const rowIndexByTask = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      if (row.kind === "task") map.set(row.task.id, index);
    });
    return map;
  }, [rows]);

  const incomingByTask = useMemo(() => {
    const map = new Map<string, PlannerDependency[]>();
    for (const dependency of dependencies) {
      const list = map.get(dependency.successorId) ?? [];
      list.push(dependency);
      map.set(dependency.successorId, list);
    }
    return map;
  }, [dependencies]);

  const outgoingByTask = useMemo(() => {
    const map = new Map<string, PlannerDependency[]>();
    for (const dependency of dependencies) {
      const list = map.get(dependency.predecessorId) ?? [];
      list.push(dependency);
      map.set(dependency.predecessorId, list);
    }
    return map;
  }, [dependencies]);

  const scrollToToday = useCallback((): void => {
    const scroller = timelineScrollerRef.current;
    if (!scroller) return;
    const x = (toDay(today) - range.start) * dayWidth;
    scroller.scrollTo({ left: Math.max(0, x - scroller.clientWidth / 2), behavior: "smooth" });
  }, [today, range.start, dayWidth]);

  useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  function openTaskEditor(taskId: string): void {
    setEditorTab("general");
    setEditorTaskId(taskId);
  }

  function toggleWbs(id: string): void {
    setCollapsed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openTaskEditor(taskId: string): void {
    setEditorTab("general");
    setEditorTaskId(taskId);
  }

  function predecessorLabel(taskId: string): string {
    return (incomingByTask.get(taskId) ?? [])
      .map(dependency => {
        const predecessor = taskById.get(dependency.predecessorId);
        const lag = dependency.lagDays === 0 ? "" : dependency.lagDays > 0 ? `+${dependency.lagDays}` : `${dependency.lagDays}`;
        return `${predecessor?.code ?? "?"}${SIGLA_PT[dependency.type]}${lag}`;
      })
      .join(", ") || "—";
  }

  const todayX = (toDay(today) - range.start) * dayWidth;
  const plannerStyle = {
    "--rows": rows.length,
    "--day-width": `${dayWidth}px`
  } as CSSProperties;

  return (
    <section className={styles.planner} style={plannerStyle}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <div className={styles.toolbarTitle}>
            <strong>Planejamento da obra</strong>
            <small>
              {wbsItems.length} {wbsItems.length === 1 ? "etapa" : "etapas"} · {tasks.length} {tasks.length === 1 ? "atividade" : "atividades"} · avanço {Math.round(projectProgress * 100)}%
            </small>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => setCreationModal("wbs")}>
            <Plus size={16} /> Etapa da EAP
          </button>
          <button className={styles.toolButton} type="button" onClick={() => setCreationModal("task")}>
            <Plus size={16} /> Atividade
          </button>
        </div>
        <div className={styles.toolbarActions}>
          <button
            className={`${styles.toolButton} ${criticalVisible ? styles.active : ""}`}
            type="button"
            onClick={() => setCriticalVisible(value => !value)}
            aria-pressed={criticalVisible}
            title="Destacar a cadeia determinante da entrega"
          >
            <LinkSimple size={16} /> Cadeia determinante
          </button>
          <button className={styles.toolButton} type="button" onClick={scrollToToday}>
            <Crosshair size={16} /> Hoje
          </button>
          <div className={styles.zoomGroup} aria-label="Escala do cronograma">
            {([["day", "D"], ["week", "S"], ["month", "M"]] as const).map(([value, label]) => (
              <button
                className={`${styles.zoomButton} ${zoom === value ? styles.active : ""}`}
                type="button"
                key={value}
                onClick={() => setZoom(value)}
                title={value === "day" ? "Dias" : value === "week" ? "Semanas" : "Meses"}
                aria-pressed={zoom === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {cycle ? (
        <div className={styles.emptyState} role="alert">
          <div>
            <strong>O cronograma contém uma dependência circular.</strong>
            Abra uma atividade e remova a relação que fecha o ciclo para voltar a calcular as datas.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>
          <div>
            <strong>Comece pela EAP.</strong>
            Cadastre as etapas, subetapas e atividades; as barras serão montadas automaticamente no calendário.
          </div>
        </div>
      ) : (
        <div className={styles.viewport}>
          <div className={styles.leftPane}>
            <div className={styles.leftHeader}>
              <div className={styles.headerCell}>EAP</div>
              <div className={styles.headerCell}>Etapa / atividade</div>
              <div className={styles.headerCell}>Duração</div>
              <div className={styles.headerCell}>Início</div>
              <div className={styles.headerCell}>Término</div>
              <div className={styles.headerCell}>Predecessoras</div>
            </div>
            {rows.map(row => {
              if (row.kind === "wbs") {
                const summaryBars = row.taskIds.map(id => barById.get(id)).filter((bar): bar is BarraCronograma => Boolean(bar));
                const start = summaryBars.length ? summaryBars.reduce((value, bar) => bar.inicio < value ? bar.inicio : value, summaryBars[0].inicio) : row.wbs.plannedStart;
                const end = summaryBars.length ? summaryBars.reduce((value, bar) => bar.termino > value ? bar.termino : value, summaryBars[0].termino) : row.wbs.plannedEnd;
                const duration = start && end ? toDay(end) - toDay(start) + 1 : null;
                return (
                  <div className={`${styles.leftRow} ${styles.summary}`} key={row.key}>
                    <div className={`${styles.cell} ${styles.codeCell}`}>{row.wbs.code}</div>
                    <div className={styles.cell}>
                      <span className={styles.treeIndent} style={{ "--depth": row.depth } as CSSProperties} />
                      {row.hasChildren ? (
                        <button className={styles.collapseButton} type="button" onClick={() => toggleWbs(row.wbs.id)} aria-label={collapsed.has(row.wbs.id) ? "Expandir etapa" : "Recolher etapa"}>
                          {collapsed.has(row.wbs.id) ? <CaretRight size={14} /> : <CaretDown size={14} />}
                        </button>
                      ) : <span className={styles.collapseButton} aria-hidden="true" />}
                      <span className={styles.summaryDot} />
                      <span className={styles.summaryName} title={row.wbs.title}>{row.wbs.title}</span>
                    </div>
                    <div className={`${styles.cell} ${styles.mutedCell}`}>{duration == null ? "—" : `${duration}d`}</div>
                    <div className={`${styles.cell} ${styles.mutedCell}`}>{formatShortDate(start)}</div>
                    <div className={`${styles.cell} ${styles.mutedCell}`}>{formatShortDate(end)}</div>
                    <div className={`${styles.cell} ${styles.mutedCell}`}>—</div>
                  </div>
                );
              }

              const selected = row.task.id === editorTaskId;
              const calculatedBar = barById.get(row.task.id);
              return (
                <div className={`${styles.leftRow} ${selected ? styles.selected : ""}`} key={row.key}>
                  <div className={`${styles.cell} ${styles.codeCell}`}>{row.task.code}</div>
                  <div className={styles.cell}>
                    <span className={styles.treeIndent} style={{ "--depth": row.depth } as CSSProperties} />
                    <span className={styles.taskDot} />
                    <button className={styles.nameButton} type="button" onClick={() => openTaskEditor(row.task.id)} title="Abrir informações da atividade">
                      {row.task.title}
                    </button>
                  </div>
                  <div className={`${styles.cell} ${styles.mutedCell}`}>{row.task.durationDays}d</div>
                  <div className={`${styles.cell} ${styles.mutedCell}`}>{formatShortDate(calculatedBar?.inicio ?? row.task.plannedStart)}</div>
                  <div className={`${styles.cell} ${styles.mutedCell}`}>{formatShortDate(calculatedBar?.termino ?? row.task.plannedEnd)}</div>
                  <div className={`${styles.cell} ${styles.mutedCell}`} title={predecessorLabel(row.task.id)}>{predecessorLabel(row.task.id)}</div>
                </div>
              );
            })}
          </div>

          <div className={styles.timelinePane}>
            <div className={styles.timelineScroller} ref={timelineScrollerRef}>
              <div className={styles.timelineCanvas} style={{ width: timelineWidth }}>
                <div className={styles.timelineHeader}>
                  <div className={styles.months}>
                    {months.map(month => (
                      <div className={styles.monthCell} key={month.key} style={{ width: month.count * dayWidth }}>
                        {month.label}
                      </div>
                    ))}
                  </div>
                  <div className={styles.days}>
                    {days.map(day => {
                      const date = dateFromDay(day);
                      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                      const isToday = day === toDay(today);
                      const showLabel = zoom === "day" || date.getUTCDay() === 1 || date.getUTCDate() === 1;
                      return (
                        <div
                          className={`${styles.dayCell} ${weekend ? styles.weekend : ""} ${isToday ? styles.today : ""}`}
                          key={day}
                          style={{ width: dayWidth }}
                          title={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(date)}
                        >
                          {showLabel ? <><span>{String(date.getUTCDate()).padStart(2, "0")}</span><small>{date.toLocaleDateString("pt-BR", { weekday: "narrow", timeZone: "UTC" })}</small></> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {days.map(day => {
                  const date = dateFromDay(day);
                  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                  return weekend ? (
                    <span
                      className={styles.weekendShade}
                      key={`shade-${day}`}
                      style={{ left: (day - range.start) * dayWidth, width: dayWidth }}
                    />
                  ) : null;
                })}
                <span className={styles.todayLine} style={{ left: todayX }} aria-hidden="true" />

                <div className={styles.timelineRows}>
                  {rows.map(row => {
                    if (row.kind === "wbs") {
                      const summaryBars = row.taskIds.map(id => barById.get(id)).filter((bar): bar is BarraCronograma => Boolean(bar));
                      const first = summaryBars.length ? Math.min(...summaryBars.map(bar => toDay(bar.inicio))) : null;
                      const last = summaryBars.length ? Math.max(...summaryBars.map(bar => toDay(bar.termino))) : null;
                      return (
                        <div className={`${styles.timelineRow} ${styles.summary}`} key={`timeline-${row.key}`}>
                          {first !== null && last !== null ? (
                            <span className={styles.summaryBar} style={{ left: (first - range.start) * dayWidth, width: (last - first + 1) * dayWidth }} />
                          ) : null}
                        </div>
                      );
                    }

                    const bar = barById.get(row.task.id);
                    if (!bar) return <div className={styles.timelineRow} key={`timeline-${row.key}`} />;
                    const start = toDay(bar.inicio);
                    const end = toDay(bar.termino);
                    const delayed = end < toDay(today) && row.task.progress < 1;
                    const visualWidth = (end - start + 1) * dayWidth;
                    const progressWidth = Math.round(visualWidth * row.task.progress);
                    return (
                      <div className={styles.timelineRow} key={`timeline-${row.key}`}>
                        <button
                          className={[
                            styles.taskBar,
                            critical.has(row.task.id) ? styles.critical : "",
                            delayed ? styles.delayed : "",
                            bar.derivada ? styles.derived : ""
                          ].filter(Boolean).join(" ")}
                          type="button"
                          style={{ left: (start - range.start) * dayWidth, width: (end - start + 1) * dayWidth }}
                          onClick={() => openTaskEditor(row.task.id)}
                          title={`${row.task.code} · ${row.task.title}: ${formatShortDate(bar.inicio)} a ${formatShortDate(bar.termino)}`}
                        >
                          <span className={styles.progressFill} style={{ width: progressWidth }} />
                          <span className={styles.barLabel}>{Math.round(row.task.progress * 100)}%</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <svg className={styles.dependencySvg} width={timelineWidth} height={rows.length * ROW_HEIGHT} aria-hidden="true">
                  <defs>
                    <marker id="planner-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
                    </marker>
                  </defs>
                  {dependencies.map(dependency => {
                    const from = barById.get(dependency.predecessorId);
                    const to = barById.get(dependency.successorId);
                    const fromRow = rowIndexByTask.get(dependency.predecessorId);
                    const toRow = rowIndexByTask.get(dependency.successorId);
                    if (!from || !to || fromRow === undefined || toRow === undefined) return null;
                    const exitsAtEnd = dependency.type === "FS" || dependency.type === "FF";
                    const entersAtEnd = dependency.type === "FF" || dependency.type === "SF";
                    const x1 = (((exitsAtEnd ? toDay(from.termino) + 1 : toDay(from.inicio)) - range.start) * dayWidth);
                    const x2 = (((entersAtEnd ? toDay(to.termino) + 1 : toDay(to.inicio)) - range.start) * dayWidth);
                    const y1 = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const y2 = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const bend = Math.max(x1, x2) + Math.max(8, dayWidth / 2);
                    const isCritical = critical.has(dependency.predecessorId) && critical.has(dependency.successorId);
                    return (
                      <path
                        className={`${styles.dependencyPath} ${isCritical ? styles.critical : ""}`}
                        key={dependency.id}
                        d={`M ${x1} ${y1} H ${bend} V ${y2} H ${x2}`}
                        markerEnd="url(#planner-arrow)"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.legendSwatch} /> Atividade</span>
        <span className={styles.legendItem}><span className={`${styles.legendSwatch} ${styles.critical}`} /> Cadeia que empurra a entrega</span>
        <span className={styles.legendItem}><span className={`${styles.legendSwatch} ${styles.summary}`} /> Etapa resumo da EAP</span>
        <span className={styles.legendItem}><CalendarBlank size={14} /> Linha vermelha: hoje</span>
      </footer>

      {creationModal === "wbs" ? (
        <ModalShell title="Nova etapa da EAP" subtitle="Crie uma etapa principal ou uma subetapa" onClose={() => setCreationModal(null)} small>
          <form action={createScheduleWbs} className={styles.modalBody}>
            <input type="hidden" name="projectId" value={projectId} />
            <div className={styles.formGrid}>
              <label className={styles.field}>Código EAP<input name="code" placeholder="automático" /><small className={styles.dica}>Deixe em branco para numerar sozinho: 1, 1.1, 1.2…</small></label>
              <label className={styles.field}>Etapa superior<select name="parentId" defaultValue=""><option value="">Etapa principal</option>{wbsItems.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
              <label className={styles.fullField}>
                Nome da etapa
                {/* Campo com apoio, não lista fechada: o que a construtora já
                    chamou de "Fundação" em outras obras aparece, e um nome
                    inédito continua passando. */}
                <CampoComSugestao
                  name="title"
                  sugestoes={sugestoesDeEtapa}
                  value={tituloDaEtapa}
                  onValueChange={setTituloDaEtapa}
                  required
                  maxLength={160}
                />
              </label>
              {modeloDaEtapa ? (
                <div className={styles.fullField}>
                  <ModeloDeEtapaSugerido modelo={modeloDaEtapa} />
                </div>
              ) : null}
              <label className={styles.fullField}>Descrição<textarea name="description" /></label>
              <label className={styles.field}>Início planejado<input type="date" name="plannedStart" defaultValue={projectStart ?? ""} /></label>
              <label className={styles.field}>Término planejado<input type="date" name="plannedEnd" defaultValue={projectEnd ?? ""} /></label>
              <label className={styles.field}>Ordem<input type="number" name="sequence" defaultValue="0" /></label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryButton} type="button" onClick={() => setCreationModal(null)}>Cancelar</button>
              <button className={styles.primaryButton} type="submit">Adicionar etapa</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {creationModal === "task" ? (
        <ModalShell title="Nova atividade" subtitle="Inclua a atividade na EAP e defina sua duração" onClose={() => setCreationModal(null)} small>
          <form action={createScheduleTask} className={styles.modalBody}>
            <input type="hidden" name="projectId" value={projectId} />
            <div className={styles.formGrid}>
              <label className={styles.field}>Código<input name="code" placeholder="automático" /><small className={styles.dica}>Em branco, segue a numeração da etapa escolhida.</small></label>
              <label className={styles.field}>Etapa da EAP<select name="wbsId" defaultValue=""><option value="">Sem etapa</option>{wbsItems.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
              <label className={styles.fullField}>
                Nome da atividade
                <CampoComSugestao name="title" sugestoes={sugestoesDeAtividade} required maxLength={160} />
              </label>
              <label className={styles.fullField}>Descrição<textarea name="description" /></label>
              <label className={styles.field}>Duração (dias úteis)<input type="number" min="1" step="1" name="durationDays" defaultValue="1" required /></label>
              <label className={styles.field}>Atividade superior<select name="parentTaskId" defaultValue=""><option value="">Nenhuma</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
              <label className={styles.field}>Início planejado<input type="date" name="plannedStart" defaultValue={projectStart ?? today} /></label>
              <label className={styles.field}>Término planejado<input type="date" name="plannedEnd" /></label>
              <label className={styles.field}>Ordem<input type="number" name="sequence" defaultValue="0" /></label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryButton} type="button" onClick={() => setCreationModal(null)}>Cancelar</button>
              <button className={styles.primaryButton} type="submit">Adicionar atividade</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedTask ? (
        <ModalShell
          title={`${selectedTask.code} · ${selectedTask.title}`}
          subtitle="Informações da atividade"
          onClose={() => setEditorTaskId(null)}
        >
          <nav className={styles.tabs} aria-label="Seções da atividade">
            <button className={`${styles.tab} ${editorTab === "general" ? styles.active : ""}`} type="button" onClick={() => setEditorTab("general")}>Geral</button>
            <button className={`${styles.tab} ${editorTab === "dependencies" ? styles.active : ""}`} type="button" onClick={() => setEditorTab("dependencies")}>Predecessoras e sucessoras</button>
          </nav>

          {editorTab === "general" ? (
            <form action={updateScheduleTask} className={styles.modalBody} key={`general-${selectedTask.id}`}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="taskId" value={selectedTask.id} />
              <div className={`${styles.formGrid} ${styles.three}`}>
                <label className={styles.field}>Código<input name="code" defaultValue={selectedTask.code} required /></label>
                <label className={styles.field}>Etapa da EAP<select name="wbsId" defaultValue={selectedTask.wbsId ?? ""}><option value="">Sem etapa</option>{wbsItems.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
                <label className={styles.field}>Ordem<input type="number" name="sequence" defaultValue={selectedTask.sequence} /></label>
                <label className={styles.fullField}>Nome da atividade<input name="title" defaultValue={selectedTask.title} required /></label>
                <label className={styles.fullField}>Descrição<textarea name="description" defaultValue={selectedTask.description ?? ""} /></label>
                <label className={styles.field}>Duração (dias úteis)<input type="number" min="1" step="1" name="durationDays" defaultValue={selectedTask.durationDays} required /></label>
                <label className={styles.field}>Início planejado<input type="date" name="plannedStart" defaultValue={selectedTask.plannedStart ?? ""} /></label>
                <label className={styles.field}>Término planejado<input type="date" name="plannedEnd" defaultValue={selectedTask.plannedEnd ?? ""} /></label>
                <label className={styles.field}>Avanço (%)<input type="number" min="0" max="100" step="1" name="progressPercent" defaultValue={Math.round(selectedTask.progress * 100)} /></label>
                <label className={styles.field}>Status<select name="status" defaultValue={selectedTask.status}><option value="BACKLOG">Backlog</option><option value="READY">Pronta</option><option value="IN_PROGRESS">Em execução</option><option value="BLOCKED">Bloqueada</option><option value="REVIEW">Em revisão</option><option value="COMPLETED">Concluída</option><option value="CANCELED">Cancelada</option></select></label>
                <label className={styles.field}>Prioridade<select name="priority" defaultValue={selectedTask.priority}><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label>
                <label className={styles.field}>Atividade superior<select name="parentTaskId" defaultValue={selectedTask.parentTaskId ?? ""}><option value="">Nenhuma</option>{tasks.filter(task => task.id !== selectedTask.id).map(task => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.secondaryButton} type="button" onClick={() => setEditorTaskId(null)}>Cancelar</button>
                <button className={styles.primaryButton} type="submit">Salvar alterações</button>
              </div>
            </form>
          ) : (
            <div className={styles.modalBody}>
              <div className={styles.relationColumns}>
                <section className={styles.relationPanel}>
                  <h3>Predecessoras</h3>
                  <div className={styles.relationList}>
                    {(incomingByTask.get(selectedTask.id) ?? []).map(dependency => {
                      const related = taskById.get(dependency.predecessorId);
                      return (
                        <div className={styles.relationRow} key={dependency.id}>
                          <span title={related?.title}>{related ? `${related.code} · ${related.title}` : "Atividade não encontrada"}</span>
                          <span className={styles.relationType} title={ROTULO_DEPENDENCIA[dependency.type]}>{SIGLA_PT[dependency.type]}{dependency.lagDays ? dependency.lagDays > 0 ? `+${dependency.lagDays}` : dependency.lagDays : ""}</span>
                          <form action={deleteScheduleDependency}>
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="dependencyId" value={dependency.id} />
                            <button className={styles.dangerButton} type="submit" aria-label="Remover dependência">×</button>
                          </form>
                        </div>
                      );
                    })}
                    {!incomingByTask.get(selectedTask.id)?.length ? <p className={styles.relationEmpty}>Nenhuma predecessora cadastrada.</p> : null}
                  </div>
                </section>

                <section className={styles.relationPanel}>
                  <h3>Sucessoras</h3>
                  <div className={styles.relationList}>
                    {(outgoingByTask.get(selectedTask.id) ?? []).map(dependency => {
                      const related = taskById.get(dependency.successorId);
                      return (
                        <div className={styles.relationRow} key={dependency.id}>
                          <span title={related?.title}>{related ? `${related.code} · ${related.title}` : "Atividade não encontrada"}</span>
                          <span className={styles.relationType} title={ROTULO_DEPENDENCIA[dependency.type]}>{SIGLA_PT[dependency.type]}{dependency.lagDays ? dependency.lagDays > 0 ? `+${dependency.lagDays}` : dependency.lagDays : ""}</span>
                          <form action={deleteScheduleDependency}>
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="dependencyId" value={dependency.id} />
                            <button className={styles.dangerButton} type="submit" aria-label="Remover dependência">×</button>
                          </form>
                        </div>
                      );
                    })}
                    {!outgoingByTask.get(selectedTask.id)?.length ? <p className={styles.relationEmpty}>Nenhuma sucessora cadastrada.</p> : null}
                  </div>
                </section>
              </div>

              <section className={styles.addRelation}>
                <form action={createScheduleDependency}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="successorTaskId" value={selectedTask.id} />
                  <div className={`${styles.formGrid} ${styles.three}`}>
                    <label className={styles.field}>Adicionar predecessora<select name="predecessorTaskId" defaultValue="" required><option value="">Selecione</option>{tasks.filter(task => task.id !== selectedTask.id).map(task => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
                    <label className={styles.field}>Relação<select name="dependencyType" defaultValue="FS"><option value="FS">Término → Início</option><option value="SS">Início → Início</option><option value="FF">Término → Término</option><option value="SF">Início → Término</option></select></label>
                    <label className={styles.field}>Defasagem (dias)<input type="number" step="1" name="lagDays" defaultValue="0" /></label>
                  </div>
                  <div className={styles.modalFooter}><button className={styles.primaryButton} type="submit">Vincular predecessora</button></div>
                </form>
              </section>

              <section className={styles.addRelation}>
                <form action={createScheduleDependency}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="predecessorTaskId" value={selectedTask.id} />
                  <div className={`${styles.formGrid} ${styles.three}`}>
                    <label className={styles.field}>Adicionar sucessora<select name="successorTaskId" defaultValue="" required><option value="">Selecione</option>{tasks.filter(task => task.id !== selectedTask.id).map(task => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
                    <label className={styles.field}>Relação<select name="dependencyType" defaultValue="FS"><option value="FS">Término → Início</option><option value="SS">Início → Início</option><option value="FF">Término → Término</option><option value="SF">Início → Término</option></select></label>
                    <label className={styles.field}>Defasagem (dias)<input type="number" step="1" name="lagDays" defaultValue="0" /></label>
                  </div>
                  <div className={styles.modalFooter}><button className={styles.primaryButton} type="submit">Vincular sucessora</button></div>
                </form>
              </section>
            </div>
          )}
        </ModalShell>
      ) : null}
    </section>
  );
}
