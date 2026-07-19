import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-hero">
      <div>
        <span className="badge">CAMPOS DO JORDÃO · ALTO PADRÃO</span>
        <h1>Alto padrão começa pela forma de construir.</h1>
        <p>
          Projetos, obras, reformas e móveis planejados com planejamento, transparência
          e controle documental em cada etapa.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link className="button button-primary" href="/login?redirect=/app/orcamentos">
            Acessar a plataforma
          </Link>
          <Link className="button button-secondary" href="/login?redirect=/cliente/orcamentos">
            Portal do cliente
          </Link>
        </div>
        <p style={{ fontSize: 13, marginTop: 24 }}>
          Etapa 9: orçamento persistido, propostas, contratos, aditivos e assinaturas.
        </p>
      </div>
    </main>
  );
}
