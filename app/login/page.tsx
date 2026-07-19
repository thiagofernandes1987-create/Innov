import type { Metadata } from "next";
import { signIn } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand" style={{ color: "var(--text)" }}>
          <div className="brand-mark" aria-hidden="true">I</div>
          <div>
            <strong>INNOVAR</strong>
            <small style={{ color: "var(--muted)" }}>Portal seguro</small>
          </div>
        </div>
        <h1 id="login-title" style={{ fontSize: 34 }}>Acessar plataforma</h1>
        <p className="muted">Entre para acessar orçamentos, propostas, contratos e assinaturas.</p>
        {params.error ? (
          <div className="validation blocking" role="alert">{params.error}</div>
        ) : null}
        <form action={signIn}>
          <input type="hidden" name="redirectTo" value={params.redirect ?? "/app/orcamentos"} />
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button button-primary" type="submit">Entrar</button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
          Contas de homologação são criadas somente no Supabase e nunca têm a senha exibida nesta tela.
        </p>
      </section>
    </main>
  );
}
