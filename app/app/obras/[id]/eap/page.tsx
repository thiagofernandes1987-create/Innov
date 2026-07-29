import { notFound } from "next/navigation";
import { createWbsItem } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";

export default async function WbsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [projectResult, itemsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("work_breakdown_items").select("id,parent_id,code,title,status,sequence,weight,progress,planned_start,planned_end,client_visible").eq("project_id", id).order("sequence")
  ]);

  reportDataAccessError("project-wbs.project", projectResult.error);
  reportDataAccessError("project-wbs.collection", itemsResult.error);

  if (projectResult.error) {
    return (
      <main className="content">
        <ProjectNav projectId={id} />
        <h1>Estrutura Analítica</h1>
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      </main>
    );
  }

  const project = projectResult.data;
  if (!project) notFound();

  const items = itemsResult.data ?? [];
  const itemsLoadFailed = Boolean(itemsResult.error);
  const byParent = new Map<string | null, typeof items>();
  for (const item of items) {
    const key = item.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const flattened: Array<(typeof items)[number] & { level: number }> = [];
  const visit = (parentId: string | null, level: number) => {
    for (const item of byParent.get(parentId) ?? []) {
      flattened.push({ ...item, level });
      visit(item.id, level + 1);
    }
  };
  visit(null, 0);
  const totalWeight = items.filter((item) => !item.parent_id).reduce((sum, item) => sum + Number(item.weight), 0);

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Estrutura Analítica</h1>
          <p className="muted">Pacotes de trabalho, pesos, datas e progresso consolidado.</p>
        </div>
        {!itemsLoadFailed ? (
          <span className={Math.abs(totalWeight - 1) < 0.0001 ? "badge badge-success" : "badge badge-warning"}>
            Peso raiz: {formatPercent(totalWeight)}
          </span>
        ) : null}
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {itemsLoadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      <div className="split-layout">
        <section className="wbs-tree">
          {!itemsLoadFailed ? (
            <>
              {flattened.map((item) => (
                <article key={item.id} className="wbs-node" data-level={Math.min(item.level, 2)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap" }}>
                    <div>
                      <span className="mono muted">{item.code}</span>
                      <h3 style={{ margin: "4px 0" }}>{item.title}</h3>
                      <span className={statusBadge(item.status)}>{item.status}</span>
                      {!item.client_visible ? <span className="badge" style={{ marginLeft: 7 }}>Interno</span> : null}
                    </div>
                    <div style={{ minWidth: 190 }}>
                      <div className="progress-row">
                        <div><span>Progresso</span><strong>{formatPercent(item.progress)}</strong></div>
                        <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(item.progress) }} /></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }} className="muted">
                    <span>Peso: {formatPercent(item.weight, 1)}</span>
                    <span>{formatDate(item.planned_start)} → {formatDate(item.planned_end)}</span>
                  </div>
                </article>
              ))}
              {!flattened.length ? <section className="card card-pad"><strong>EAP ainda vazia.</strong><p className="muted">Comece pelos grandes pacotes: projetos, mobilização, fundações, estrutura, instalações, acabamentos e entrega.</p></section> : null}
            </>
          ) : <section className="card card-pad"><strong>EAP temporariamente indisponível.</strong><p className="muted">Pesos, progresso e hierarquia não foram confirmados.</p></section>}
        </section>

        <aside className="card form-card">
          <h2>Novo pacote</h2>
          {!itemsLoadFailed ? (
            <>
              <p className="muted">Organize o escopo em níveis hierárquicos.</p>
              <form action={createWbsItem}>
                <input type="hidden" name="projectId" value={id} />
                <label>Pacote pai
                  <select name="parentId"><option value="">Nível raiz</option>{items.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select>
                </label>
                <div className="field-grid">
                  <label>Código<input name="code" placeholder="03.02" required /></label>
                  <label>Sequência<input type="number" name="sequence" defaultValue="0" /></label>
                </div>
                <label>Título<input name="title" required /></label>
                <label>Descrição<textarea name="description" rows={3} /></label>
                <div className="field-grid">
                  <label>Peso (%)<input type="number" step="0.01" min="0" max="100" name="weightPercent" /></label>
                  <label>Início<input type="date" name="plannedStart" /></label>
                  <label>Término<input type="date" name="plannedEnd" /></label>
                  <label style={{ alignContent: "end" }}><span><input style={{ width: "auto" }} type="checkbox" name="clientVisible" defaultChecked /> Visível ao cliente</span></label>
                </div>
                <button className="button button-primary" type="submit">Adicionar à EAP</button>
              </form>
            </>
          ) : <p className="muted">O cadastro está bloqueado porque a hierarquia atual não pôde ser carregada com segurança.</p>}
        </aside>
      </div>
    </main>
  );
}
