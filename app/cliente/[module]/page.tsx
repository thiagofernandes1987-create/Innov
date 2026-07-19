import Link from "next/link";
import { requireClientContext } from "@/lib/auth";

const moduleLabels: Record<string, { title: string; description: string }> = {
  documentos: { title: "Documentos", description: "Projetos, relatórios e arquivos liberados para sua conta." },
  ocorrencias: { title: "Ocorrências", description: "Abertura e acompanhamento de solicitações e assistência técnica." },
  perfil: { title: "Perfil e segurança", description: "Dados da conta, sessões e configurações de segurança." }
};

type ModulePageProps = { params: Promise<{ module: string }> };

export default async function ClientModulePage({ params }: ModulePageProps) {
  await requireClientContext();
  const { module } = await params;
  const meta = moduleLabels[module] ?? {
    title: "Área do cliente",
    description: "Esta funcionalidade está prevista no portal da Innovar."
  };

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge badge-warning">EM IMPLANTAÇÃO</span>
          <h1>{meta.title}</h1>
          <p className="muted">{meta.description}</p>
        </div>
        <Link className="button button-primary" href="/cliente/orcamentos">Voltar à área comercial</Link>
      </div>
      <section className="card card-pad">
        <h2>Transparência do desenvolvimento</h2>
        <p>
          A rota já está protegida e integrada à navegação. O conteúdo funcional será
          disponibilizado somente depois de implementar regras de acesso, persistência e auditoria.
        </p>
      </section>
    </main>
  );
}
