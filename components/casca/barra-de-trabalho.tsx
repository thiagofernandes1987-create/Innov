import type { ReactNode } from "react";

// Barra 2 transversal. A casca define a anatomia; cada domínio fornece apenas
// ação, identidade curta, busca/filtros e controles que realmente funcionam.
export function BarraDeTrabalho({
  title,
  primaryAction,
  identity,
  meta,
  search,
  controls
}: {
  title: string;
  primaryAction?: ReactNode;
  identity?: ReactNode;
  meta?: ReactNode;
  search?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <header className="barra-controle" aria-label={`Ferramentas de ${title}`}>
      <div className="barra-controle-esquerda">
        {primaryAction}
        {identity ?? <h1 className="barra-controle-titulo">{title}</h1>}
        {identity ? <h1 className="sr-only">{title}</h1> : null}
        {meta}
      </div>
      {search}
      {controls}
    </header>
  );
}
