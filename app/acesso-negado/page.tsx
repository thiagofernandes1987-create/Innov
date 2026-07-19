import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="badge badge-danger">ACESSO NEGADO</span>
        <h1 style={{ fontSize: 34, marginTop: 18 }}>Este perfil não possui acesso ao módulo.</h1>
        <p className="muted">
          A autorização é validada no servidor e pelas políticas RLS do banco de dados.
        </p>
        <Link className="button button-primary" href="/">Voltar ao início</Link>
      </section>
    </main>
  );
}
