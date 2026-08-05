import { SchedulePlanner, type PlannerDependency, type PlannerTask, type PlannerWbs } from "@/components/planejamento/schedule-planner";

const TODAY = "2026-08-17";

const WBS: PlannerWbs[] = [
  { id: "wbs-1", parentId: null, code: "1", title: "Serviços preliminares", sequence: 1, plannedStart: "2026-07-06", plannedEnd: "2026-07-17", progress: 1 },
  { id: "wbs-2", parentId: null, code: "2", title: "Fundação", sequence: 2, plannedStart: "2026-07-20", plannedEnd: "2026-09-04", progress: 0.42 },
  { id: "wbs-3", parentId: null, code: "3", title: "Estrutura", sequence: 3, plannedStart: "2026-09-07", plannedEnd: "2026-10-16", progress: 0 },
  { id: "wbs-4", parentId: null, code: "4", title: "Alvenaria", sequence: 4, plannedStart: "2026-10-19", plannedEnd: "2026-11-13", progress: 0 },
  { id: "wbs-5", parentId: null, code: "5", title: "Instalações", sequence: 5, plannedStart: "2026-10-26", plannedEnd: "2026-11-27", progress: 0 },
  { id: "wbs-6", parentId: null, code: "6", title: "Acabamentos", sequence: 6, plannedStart: "2026-11-16", plannedEnd: "2027-01-29", progress: 0 }
];

const TASKS: PlannerTask[] = [
  { id: "t-11", wbsId: "wbs-1", parentTaskId: null, code: "1.1", title: "Mobilização da obra", description: "Mobilização, tapumes e instalações provisórias.", status: "COMPLETED", priority: "NORMAL", sequence: 1, plannedStart: "2026-07-06", plannedEnd: "2026-07-10", durationDays: 5, progress: 1 },
  { id: "t-12", wbsId: "wbs-1", parentTaskId: null, code: "1.2", title: "Instalação do canteiro", description: "Implantação do canteiro e áreas de apoio.", status: "COMPLETED", priority: "NORMAL", sequence: 2, plannedStart: "2026-07-13", plannedEnd: "2026-07-17", durationDays: 5, progress: 1 },
  { id: "t-21", wbsId: "wbs-2", parentTaskId: null, code: "2.1", title: "Escavação", description: "Escavação e preparação das fundações.", status: "COMPLETED", priority: "HIGH", sequence: 1, plannedStart: "2026-07-20", plannedEnd: "2026-07-24", durationDays: 5, progress: 1 },
  { id: "t-22", wbsId: "wbs-2", parentTaskId: null, code: "2.2", title: "Forma e armadura", description: "Execução de formas e armação conforme projeto estrutural.", status: "IN_PROGRESS", priority: "HIGH", sequence: 2, plannedStart: "2026-07-27", plannedEnd: "2026-08-14", durationDays: 15, progress: 0.25 },
  { id: "t-23", wbsId: "wbs-2", parentTaskId: null, code: "2.3", title: "Concretagem", description: "Concretagem e cura das fundações.", status: "READY", priority: "CRITICAL", sequence: 3, plannedStart: null, plannedEnd: null, durationDays: 5, progress: 0 },
  { id: "t-31", wbsId: "wbs-3", parentTaskId: null, code: "3.1", title: "Pilares", description: "Formas, armação e concretagem dos pilares.", status: "BACKLOG", priority: "NORMAL", sequence: 1, plannedStart: null, plannedEnd: null, durationDays: 10, progress: 0 },
  { id: "t-32", wbsId: "wbs-3", parentTaskId: null, code: "3.2", title: "Vigas", description: "Execução das vigas estruturais.", status: "BACKLOG", priority: "NORMAL", sequence: 2, plannedStart: null, plannedEnd: null, durationDays: 10, progress: 0 },
  { id: "t-33", wbsId: "wbs-3", parentTaskId: null, code: "3.3", title: "Lajes", description: "Montagem, armação e concretagem das lajes.", status: "BACKLOG", priority: "NORMAL", sequence: 3, plannedStart: null, plannedEnd: null, durationDays: 10, progress: 0 },
  { id: "t-41", wbsId: "wbs-4", parentTaskId: null, code: "4.1", title: "Alvenaria interna", description: "Elevação e conferência das paredes internas.", status: "BACKLOG", priority: "NORMAL", sequence: 1, plannedStart: null, plannedEnd: null, durationDays: 12, progress: 0 },
  { id: "t-42", wbsId: "wbs-4", parentTaskId: null, code: "4.2", title: "Alvenaria externa", description: "Elevação das paredes externas.", status: "BACKLOG", priority: "NORMAL", sequence: 2, plannedStart: null, plannedEnd: null, durationDays: 12, progress: 0 },
  { id: "t-51", wbsId: "wbs-5", parentTaskId: null, code: "5.1", title: "Elétrica", description: "Infraestrutura e passagem de circuitos.", status: "BACKLOG", priority: "NORMAL", sequence: 1, plannedStart: null, plannedEnd: null, durationDays: 12, progress: 0 },
  { id: "t-52", wbsId: "wbs-5", parentTaskId: null, code: "5.2", title: "Hidráulica", description: "Redes de água fria e quente.", status: "BACKLOG", priority: "NORMAL", sequence: 2, plannedStart: null, plannedEnd: null, durationDays: 12, progress: 0 },
  { id: "t-53", wbsId: "wbs-5", parentTaskId: null, code: "5.3", title: "Esgoto", description: "Redes sanitárias e ventilação.", status: "BACKLOG", priority: "NORMAL", sequence: 3, plannedStart: null, plannedEnd: null, durationDays: 10, progress: 0 },
  { id: "t-61", wbsId: "wbs-6", parentTaskId: null, code: "6.1", title: "Revestimentos", description: "Revestimentos internos e externos.", status: "BACKLOG", priority: "NORMAL", sequence: 1, plannedStart: null, plannedEnd: null, durationDays: 25, progress: 0 }
];

const DEPENDENCIES: PlannerDependency[] = [
  { id: "d-1", predecessorId: "t-11", successorId: "t-12", type: "FS", lagDays: 0 },
  { id: "d-2", predecessorId: "t-12", successorId: "t-21", type: "FS", lagDays: 0 },
  { id: "d-3", predecessorId: "t-21", successorId: "t-22", type: "FS", lagDays: 0 },
  { id: "d-4", predecessorId: "t-22", successorId: "t-23", type: "FS", lagDays: 1 },
  { id: "d-5", predecessorId: "t-23", successorId: "t-31", type: "FS", lagDays: 0 },
  { id: "d-6", predecessorId: "t-31", successorId: "t-32", type: "FS", lagDays: 0 },
  { id: "d-7", predecessorId: "t-32", successorId: "t-33", type: "FS", lagDays: 0 },
  { id: "d-8", predecessorId: "t-33", successorId: "t-41", type: "FS", lagDays: 0 },
  { id: "d-9", predecessorId: "t-33", successorId: "t-42", type: "FS", lagDays: 3 },
  { id: "d-10", predecessorId: "t-41", successorId: "t-51", type: "SS", lagDays: 5 },
  { id: "d-11", predecessorId: "t-42", successorId: "t-52", type: "SS", lagDays: 5 },
  { id: "d-12", predecessorId: "t-52", successorId: "t-53", type: "FS", lagDays: 0 },
  { id: "d-13", predecessorId: "t-41", successorId: "t-61", type: "FS", lagDays: 0 }
];

export default function AmostraPlanejamento() {
  return (
    <main className="content" style={{ maxWidth: "none", padding: 18 }}>
      <div className="page-head">
        <div>
          <span className="badge">OBR-ALPHAVILLE</span>
          <h1>Cronograma — Residencial Alphaville</h1>
          <p className="muted">Fixture visual explícita; não representa dados de produção.</p>
        </div>
        <span className="badge badge-warning">Em andamento</span>
      </div>
      <SchedulePlanner
        projectId="fixture-planejamento"
        projectStart="2026-07-06"
        projectEnd="2027-01-29"
        projectProgress={0.18}
        wbsItems={WBS}
        tasks={TASKS}
        dependencies={DEPENDENCIES}
        today={TODAY}
      />
    </main>
  );
}
