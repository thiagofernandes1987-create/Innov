import Link from "next/link";
import { generateReportSnapshot } from "@/app/actions/reports";
import { MetricCard } from "@/components/reports/metric-card";
import { ReportNavigation } from "@/components/reports/report-navigation";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import {
  evaluateMetric,
  formatReportNumber,
  normalizeReportDashboard,
  targetFor,
  type ReportProject
} from "@/lib/reports/metrics";

export const dynamic = "force-dynamic";

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function ReportFilter({
  projects,
  projectId,
  start,
  end
}: {
  projects: ReportProject[];
  projectId: string | null;
  start: string;
  end: string;
}) {
  return (
    <form className="card card-pad report-filter" method="get">
      <label>Obra
        <select name="projectId" defaultValue={projectId ?? ""}>
          <option value="">Todas as obras autorizadas</option>
          {projects.map((project) => <option value={project.project_id} key={project.project_id}>{project.code} · {project.name}</option>)}
        </select>
      </label>
      <label>Início<input type="date" name="start" defaultValue={start} /></label>
      <label>Fim<input type="date" name="end" defaultValue={end} /></label>
      <button className="button button-primary">Aplicar</button>
    </form>
  );
}

export default async function ReportsDashboard({
  searchParams
}: {
  searchParams: Promise<{ projectId?: string; start?: string; end?: string; error?: string }>;
}) {
  const query = await searchParams;
  const defaults = defaultPeriod();
  const start = query.start || defaults.start;
  const end = query.end || defaults.end;
  const projectId = query.projectId || null;
  const context = await requireCapability("relatorios", "read", projectId);

  const allResult = await context.supabase.rpc("get_report_dashboard", {
    p_organization_id: context.organizationId,
    p_project_id: null,
    p_period_start: start,
    p_period_end: end
  });

  reportDataAccessError("reports.dashboard.all", allResult.error);

  if (allResult.error) {
    return (
      <main className="content reports-app">
        <section className="page-heading">
          <div>
            <span className="badge">APLICATIVO · RELATÓRIOS</span>
            <h1>Indicadores Executivos</h1>
            <p>Visão consolidada de obras, prazo, financeiro, compras e qualidade, limitada às suas permissões.</p>
          </div>
        </section>
        <ReportNavigation />
        {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
        <section className="card card-pad">
          <h2>Relatórios temporariamente indisponíveis</h2>
          <p className="muted">Nenhum indicador, total ou estado vazio foi calculado porque a carteira autorizada não pôde ser confirmada.</p>
        </section>
      </main>
    );
  }

  const allDashboard = normalizeReportDashboard(allResult.data);
  let dashboard = allDashboard;
  let selectedProjectLoadFailed = false;

  if (projectId) {
    const selectedResult = await context.supabase.rpc("get_report_dashboard", {
      p_organization_id: context.organizationId,
      p_project_id: projectId,
      p_period_start: start,
      p_period_end: end
    });
    reportDataAccessError("reports.dashboard.project", selectedResult.error);
    if (selectedResult.error) {
      selectedProjectLoadFailed = true;
    } else {
      dashboard = normalizeReportDashboard(selectedResult.data);
    }
  }

  if (selectedProjectLoadFailed) {
    return (
      <main className="content reports-app">
        <section className="page-heading">
          <div>
            <span className="badge">APLICATIVO · RELATÓRIOS</span>
            <h1>Indicadores Executivos</h1>
            <p>Visão consolidada de obras, prazo, financeiro, compras e qualidade, limitada às suas permissões.</p>
          </div>
        </section>
        <ReportNavigation />
        {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
        <ReportFilter projects={allDashboard.projects} projectId={projectId} start={start} end={end} />
        <section className="card card-pad">
          <h2>Indicadores da obra indisponíveis</h2>
          <p className="muted">A carteira autorizada foi confirmada, mas a visão da obra selecionada não carregou. Remova o filtro ou tente novamente antes de usar estes números.</p>
        </section>
      </main>
    );
  }

  const executive = dashboard.executive;
  const exportHref = `/api/relatorios/exportar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}`;
  const maxFlow = Math.max(
    1,
    ...dashboard.financeMonthly.flatMap((month) => [month.plannedInflow, month.plannedOutflow, month.realizedInflow, month.realizedOutflow])
  );

  return (
    <main className="content reports-app">
      <section className="page-heading">
        <div>
          <span className="badge">APLICATIVO · RELATÓRIOS</span>
          <h1>Indicadores Executivos</h1>
          <p>Visão consolidada de obras, prazo, financeiro, compras e qualidade, limitada às suas permissões.</p>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary" href={exportHref}>Exportar CSV</Link>
          <form action={generateReportSnapshot}>
            <input type="hidden" name="projectId" value={projectId ?? ""} />
            <input type="hidden" name="periodStart" value={start} />
            <input type="hidden" name="periodEnd" value={end} />
            <input type="hidden" name="kind" value={projectId ? "PROJECT" : "EXECUTIVE"} />
            <button className="button button-primary">Criar snapshot</button>
          </form>
        </div>
      </section>

      <ReportNavigation />
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <ReportFilter projects={allDashboard.projects} projectId={projectId} start={start} end={end} />

      <section className="stats-grid report-stats">
        <MetricCard label="OBRAS ATIVAS" value={formatReportNumber(executive.activeProjects)} detail={`${executive.delayedProjects} atrasada(s)`} health={executive.delayedProjects > 0 ? "WARNING" : "OK"} />
        <MetricCard label="PROGRESSO MÉDIO" value={formatReportNumber(executive.averageProgress, "percent")} detail={`${executive.overdueTasks} tarefa(s) atrasada(s)`} health={executive.overdueTasks > 0 ? "WARNING" : "OK"} />
        <MetricCard label="VALOR CONTRATADO" value={formatReportNumber(executive.contractValue, "currency")} detail={dashboard.financialVisible ? "contratos consolidados" : "acesso financeiro restrito"} />
        <MetricCard label="A RECEBER" value={formatReportNumber(executive.receivableOpen, "currency")} detail="saldo financeiro aberto" />
        <MetricCard label="A PAGAR" value={formatReportNumber(executive.payableOpen, "currency")} detail="saldo financeiro aberto" />
        <MetricCard label="COMPRAS" value={formatReportNumber(executive.purchaseCommitted, "currency")} detail={`${executive.overduePurchaseOrders} pedido(s) atrasado(s)`} health={evaluateMetric(executive.overduePurchaseOrders, targetFor(dashboard.targets, "overdue_purchase_orders"))} />
        <MetricCard label="CONFORMIDADE" value={formatReportNumber(executive.averageQualityScore, "percent")} detail={`${executive.pendingQualityReviews} revisão(ões) pendente(s)`} health={evaluateMetric(executive.averageQualityScore, targetFor(dashboard.targets, "average_quality_score"))} />
        <MetricCard label="NPS" value={formatReportNumber(executive.nps, "score")} detail="pesquisas de satisfação" health={evaluateMetric(executive.nps, targetFor(dashboard.targets, "nps"))} />
      </section>

      <div className="report-two-column">
        <section className="card card-pad">
          <div className="section-heading">
            <div><span className="eyebrow">CARTEIRA MULTIOBRA</span><h2>Desempenho por obra</h2></div>
            <Link className="text-link" href="/app/relatorios/obras">Abrir visão completa →</Link>
          </div>
          <div className="report-table-wrap">
            <table className="data-table">
              <thead><tr><th>Obra</th><th>Avanço</th><th>Desvio</th><th>Atraso</th><th>Qualidade</th><th>Compras</th></tr></thead>
              <tbody>
                {dashboard.projects.map((project) => {
                  const scheduleHealth = evaluateMetric(project.schedule_variance_pp, targetFor(dashboard.targets, "schedule_variance_pp", project.project_id));
                  return (
                    <tr key={project.project_id}>
                      <td><Link className="text-link" href={`/app/relatorios/obras/${project.project_id}?start=${start}&end=${end}`}>{project.code} · {project.name}</Link><small>{project.status}</small></td>
                      <td>{formatReportNumber(project.progress, "percent")}</td>
                      <td><span className={`report-health-pill report-health-${scheduleHealth.toLowerCase()}`}>{formatReportNumber(project.schedule_variance_pp, "percent")}</span></td>
                      <td>{project.overdue_days} dia(s)</td>
                      <td>{formatReportNumber(project.average_quality_score, "percent")}</td>
                      <td>{project.overdue_purchase_orders} atraso(s)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!dashboard.projects.length ? <div className="empty-state"><h3>Nenhuma obra autorizada</h3><p>Os indicadores aparecerão quando houver obra dentro do seu escopo.</p></div> : null}
          </div>
        </section>

        <aside className="card card-pad report-alerts">
          <span className="eyebrow">ATENÇÃO EXECUTIVA</span>
          <h2>Pendências atuais</h2>
          <dl className="detail-list">
            <div><dt>Obras atrasadas</dt><dd>{executive.delayedProjects}</dd></div>
            <div><dt>Tarefas bloqueadas</dt><dd>{executive.blockedTasks}</dd></div>
            <div><dt>Tarefas atrasadas</dt><dd>{executive.overdueTasks}</dd></div>
            <div><dt>Pedidos atrasados</dt><dd>{executive.overduePurchaseOrders}</dd></div>
            <div><dt>Aprovações financeiras</dt><dd>{executive.pendingFinanceApprovals ?? "Restrito"}</dd></div>
            <div><dt>Revisões de qualidade</dt><dd>{executive.pendingQualityReviews}</dd></div>
          </dl>
        </aside>
      </div>

      <section className="card card-pad">
        <div className="section-heading">
          <div><span className="eyebrow">FLUXO DE CAIXA</span><h2>Previsto x realizado</h2></div>
          <Link className="text-link" href={`/app/relatorios/financeiro?start=${start}&end=${end}${projectId ? `&projectId=${projectId}` : ""}`}>Detalhar →</Link>
        </div>
        {dashboard.financialVisible ? (
          <div className="report-flow-list">
            {dashboard.financeMonthly.map((month) => (
              <article key={month.periodMonth}>
                <header>
                  <strong>{new Date(`${month.periodMonth}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</strong>
                  <span>Previsto {formatReportNumber(month.plannedNet, "currency")} · Realizado {formatReportNumber(month.realizedNet, "currency")}</span>
                </header>
                <div className="report-bars">
                  <div style={{ width: `${Math.max(2, month.plannedInflow / maxFlow * 100)}%` }}>Entrada prevista</div>
                  <div style={{ width: `${Math.max(2, month.plannedOutflow / maxFlow * 100)}%` }}>Saída prevista</div>
                  <div style={{ width: `${Math.max(2, month.realizedInflow / maxFlow * 100)}%` }}>Entrada realizada</div>
                  <div style={{ width: `${Math.max(2, month.realizedOutflow / maxFlow * 100)}%` }}>Saída realizada</div>
                </div>
              </article>
            ))}
            {!dashboard.financeMonthly.length ? <div className="empty-state"><h3>Sem movimentação no período</h3><p>O gráfico será formado pelas parcelas e baixas financeiras.</p></div> : null}
          </div>
        ) : (
          <div className="empty-state"><h3>Indicadores financeiros restritos</h3><p>O painel preservou os indicadores operacionais e ocultou valores sensíveis.</p></div>
        )}
      </section>
    </main>
  );
}
