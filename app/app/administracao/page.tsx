import Link from "next/link";
import { requireAccessAdministration } from "@/lib/authorization";

const cards = [
  ["Aplicativos", "/app/administracao/aplicativos", "Habilitar, desabilitar ou colocar módulos em manutenção."],
  ["Perfis", "/app/administracao/perfis", "Criar perfis e definir níveis por aplicativo."],
  ["Usuários", "/app/administracao/usuarios", "Atribuir perfis, escopos e exceções individuais."],
  ["Responsabilidades", "/app/administracao/responsabilidades", "Definir quem exerce cada profissão e recebe exceções por obra."],
  ["Vocabulário", "/app/administracao/vocabulario", "Revisar as sugestões de preenchimento que a empresa acumulou pelo uso."],
  ["Auditoria", "/app/auditoria", "Consultar alterações administrativas e eventos de segurança."]
] as const;

export default async function AdministrationPage() {
  await requireAccessAdministration();
  return (
    <main className="content">
      <section className="page-heading">
        <div><span className="badge">ADMINISTRAÇÃO MODULAR</span><h1>Aplicativos e acessos</h1><p>Configure a plataforma sem alterar o código dos módulos.</p></div>
      </section>
      <section className="card-grid">
        {cards.map(([title,href,description]) => (
          <Link className="card" href={href} key={href} style={{ textDecoration:"none", color:"inherit" }}>
            <h2>{title}</h2><p>{description}</p><span className="text-link">Configurar →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
