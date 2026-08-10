import type { Metadata } from "next";
import { signIn } from "@/app/actions/auth";
import { LockupInnovar } from "@/components/casca/marca";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        {/* A única tela onde a marca aparece por extenso. É a primeira coisa
            que se vê ao entrar, e é onde o nome e a assinatura têm função:
            dizer de quem é a plataforma para quem ainda não sabe. */}
        <LockupInnovar />
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
