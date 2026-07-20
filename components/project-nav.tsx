import Link from "next/link";

const items = [
  ["Visão geral", ""],
  ["EAP", "/eap"],
  ["Cronograma", "/cronograma"],
  ["Tarefas", "/tarefas"],
  ["Diário de obra", "/diario"],
  ["Documentos", "/documentos"],
  ["Equipes e recursos", "/equipes"]
] as const;

export function ProjectNav({ projectId }: { projectId: string }) {
  return (
    <nav className="project-nav" aria-label="Módulos da obra">
      {items.map(([label, suffix]) => (
        <Link key={suffix || "overview"} href={`/app/obras/${projectId}${suffix}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
