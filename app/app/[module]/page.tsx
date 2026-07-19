import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";

const moduleLabels: Record<string, { title: string; description: string }> = {
  crm: { title: "CRM", description: "Leads, oportunidades, atividades e pipeline comercial." },
  clientes: { title: "Clientes", description: "Cadastros, contatos, projetos e histórico de relacionamento." },
  obras: { title: "Obras", description: "Planejamento, execução, progresso e recursos por obra." },
  planejamento: { title: "Planejamento", description: "EAP, tarefas, cronograma, marcos e alertas." },
  documentos: { title: "Documentos", description: "Arquivos privados, versões, aprovações e liberações." },
  auditoria: { title: "Auditoria", description: "Eventos imutáveis de segurança, finanças e contratos." }
};

type ModulePageProps = { params: Promise<{ module: string }> };

export default async function InternalModulePage({ params }: ModulePageProps) {
  await requireOrganizationContext();
  const { module } = await params;
  const meta = moduleLabels[module] ?? {
    title: "Módulo interno",
    description: "Esta área está planejada no SPEC da Innovar Platform."
  };

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge badge-warning">EM IMPLANTAÇÃO</span>
          <h1>{meta.title}</h1>
          <p className="muted">{meta.description}</p>
        </div>
        <Link className="button button-primary" href="/app/orcamentos">Abrir Orçamentos</Link>
      </div>
      <section className="card card-pad">
        <h2>Próximas entregas</h2>
        <p>
          A rota está ativa para preservar a navegação. A implementação funcional será
          adicionada por uma etapa vertical própria, com banco, RLS, auditoria e testes.
        </p>
        <div className="validation">
          Nenhum dado fictício é tratado como informação de produção.
        </div>
      </section>
    </main>
  );
}
