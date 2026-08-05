"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname() ?? "";
  const basePath = `/app/obras/${projectId}`;

  return (
    <nav className="project-nav" aria-label="Módulos da obra">
      {items.map(([label, suffix]) => {
        const href = `${basePath}${suffix}`;
        const active = suffix === "" ? pathname === basePath : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={suffix || "overview"}
            href={href}
            className={active ? "ativo" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
