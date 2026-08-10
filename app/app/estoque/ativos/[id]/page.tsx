import Link from "next/link";
import { assignInventoryAsset, returnInventoryAsset } from "@/app/actions/inventory";
import { createInventoryMaintenance } from "@/app/actions/inventory-extra";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { formatInventoryCurrency } from "@/lib/inventory/domain";

export const dynamic = "force-dynamic";

type AssetDetail = {
  sensitiveVisible: boolean;
  asset: {
    id: string;
    itemId: string;
    warehouseId: string | null;
    warehouseName: string | null;
    locationId: string | null;
    locationName: string | null;
    projectId: string | null;
    projectCode: string | null;
    projectName: string | null;
    lotId: string | null;
    patrimonyCode: string | null;
    serialNumber: string | null;
    status: string;
    acquiredOn: string | null;
    acquisitionCost: number | null;
    conditionNotes: string;
    active: boolean;
  };
  item: { code: string; name: string; kind: string };
  custodies: Array<{
    id: string;
    status: string;
    projectId: string | null;
    projectCode: string | null;
    projectName: string | null;
    teamId: string | null;
    teamName: string | null;
    responsibleUserId: string | null;
    responsibleName: string | null;
    assignedAt: string;
    expectedReturnAt: string | null;
    returnedAt: string | null;
    assignedCondition: string;
    returnedCondition: string;
    notes: string;
  }>;
  maintenance: Array<{
    id: string;
    status: string;
    title: string;
    description: string;
    providerName: string | null;
    scheduledFor: string | null;
    startedAt: string | null;
    completedAt: string | null;
    cost: number | null;
    notes: string;
    createdAt: string;
  }>;
};

export default async function InventoryAssetDetail({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("estoque", "read");

  const [{ data, error }, { data: projects }, { data: teams }, { data: warehouses }] = await Promise.all([
    context.supabase.rpc("get_inventory_asset_detail", { p_asset_id: id }),
    context.supabase.from("projects").select("id,code,name").eq("organization_id", context.organizationId).is("archived_at", null).order("name"),
    context.supabase.from("project_teams").select("id,project_id,name").eq("organization_id", context.organizationId).eq("active", true).order("name"),
    context.supabase.from("inventory_warehouses").select("id,name,project_id,inventory_locations(id,name)").eq("organization_id", context.organizationId).eq("active", true).order("name")
  ]);

  if (error) reportDataAccessError("inventory.asset-detail.load", error);
  if (error || !data) {
    return <main className="content inventory-app"><div className="empty-state"><h1>Ativo não encontrado</h1><p>Registro indisponível.</p></div></main>;
  }

  const detail = data as AssetDetail;
  const asset = detail.asset;
  const activeCustody = detail.custodies.find(value => value.status === "ACTIVE") ?? null;
  const canUpdate = await hasCapability("estoque", "update", asset.projectId, context);

  return <main className="content inventory-app">
    <Link className="back-link" href="/app/estoque/ativos">← Ativos</Link>
    <section className="page-heading">
      <div>
        <span className="badge">{detail.item.code} · {asset.status}</span>
        <h1>{detail.item.name}</h1>
        <p>{asset.patrimonyCode ? `Patrimônio ${asset.patrimonyCode}` : ""}{asset.serialNumber ? ` · Série ${asset.serialNumber}` : ""}</p>
      </div>
    </section>
    <InventoryNavigation />
    {query.error && <div className="validation blocking">{query.error}</div>}

    <section className="stats-grid inventory-stats">
      <article className="card"><small>STATUS</small><strong>{asset.status}</strong><span>situação patrimonial</span></article>
      <article className="card"><small>LOCAL</small><strong>{asset.warehouseName ?? asset.projectName ?? "Em custódia"}</strong><span>{asset.locationName ?? "sem localização"}</span></article>
      <article className="card"><small>AQUISIÇÃO</small><strong>{formatInventoryCurrency(asset.acquisitionCost)}</strong><span>{asset.acquiredOn ? new Date(`${asset.acquiredOn}T12:00:00`).toLocaleDateString("pt-BR") : "data não informada"}</span></article>
    </section>

    <div className="inventory-two-column">
      <section className="card card-pad">
        <span className="eyebrow">CUSTÓDIA</span>
        <h2>{activeCustody ? "Ativo entregue" : "Ativo disponível"}</h2>
        {activeCustody ? <dl className="detail-list">
          <div><dt>Obra</dt><dd>{activeCustody.projectName ?? "—"}</dd></div>
          <div><dt>Equipe</dt><dd>{activeCustody.teamName ?? "—"}</dd></div>
          <div><dt>Responsável</dt><dd>{activeCustody.responsibleName ?? "Usuário interno"}</dd></div>
          <div><dt>Entrega</dt><dd>{new Date(activeCustody.assignedAt).toLocaleString("pt-BR")}</dd></div>
          <div><dt>Retorno esperado</dt><dd>{activeCustody.expectedReturnAt ? new Date(activeCustody.expectedReturnAt).toLocaleString("pt-BR") : "—"}</dd></div>
          <div><dt>Condição</dt><dd>{activeCustody.assignedCondition || "—"}</dd></div>
        </dl> : <p>O ativo está disponível para entrega a uma obra, equipe ou responsável.</p>}

        {canUpdate && !activeCustody && asset.status === "AVAILABLE" && <form action={assignInventoryAsset} className="inventory-form compact-form">
          <input type="hidden" name="assetId" value={id} />
          <label>Obra<select name="projectId" required><option value="">Selecione</option>{(projects ?? []).map(value => <option key={value.id} value={value.id}>{value.code} · {value.name}</option>)}</select></label>
          <label>Equipe<select name="teamId"><option value="">Sem equipe</option>{(teams ?? []).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
          <label>Responsável externo/nome<input name="responsibleName" /></label>
          <label>Retorno esperado<input type="datetime-local" name="expectedReturnAt" /></label>
          <label>Condição<input name="condition" /></label>
          <label>Observação<input name="notes" /></label>
          <button className="button button-primary">Entregar ativo</button>
        </form>}

        {canUpdate && activeCustody && <form action={returnInventoryAsset} className="inventory-form compact-form">
          <input type="hidden" name="assetId" value={id} />
          <input type="hidden" name="custodyId" value={activeCustody.id} />
          <input type="hidden" name="projectId" value={activeCustody.projectId ?? ""} />
          <label>Depósito de retorno<select name="warehouseId" required><option value="">Selecione</option>{(warehouses ?? []).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
          <label>Localização<select name="locationId"><option value="">Sem localização</option>{(warehouses ?? []).flatMap(value => (value.inventory_locations ?? []).map(location => <option key={location.id} value={location.id}>{value.name} · {location.name}</option>))}</select></label>
          <label>Condição na devolução<input name="condition" required /></label>
          <label>Observação<input name="notes" /></label>
          <button className="button button-primary">Registrar devolução</button>
        </form>}
      </section>

      <aside className="card card-pad">
        <span className="eyebrow">MANUTENÇÃO</span>
        <h2>Ordens e histórico</h2>
        <div className="inventory-list">
          {detail.maintenance.map(record => <article className="inventory-row" key={record.id}>
            <div><strong>{record.title}</strong><small>{record.scheduledFor ? new Date(`${record.scheduledFor}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"} · {record.providerName ?? "fornecedor não informado"}</small></div>
            <div><span className="badge">{record.status}</span><small>{formatInventoryCurrency(record.cost)}</small></div>
          </article>)}
          {!detail.maintenance.length && <div className="empty-state"><p>Sem manutenção registrada.</p></div>}
        </div>
        {canUpdate && <form action={createInventoryMaintenance} className="inventory-form compact-form">
          <input type="hidden" name="assetId" value={id} />
          <input type="hidden" name="projectId" value={asset.projectId ?? ""} />
          <label>Título<input name="title" required /></label>
          <label>Status<select name="status"><option value="SCHEDULED">Agendada</option><option value="IN_PROGRESS">Em andamento</option></select></label>
          <label>Data<input type="date" name="scheduledFor" /></label>
          <label>Prestador<input name="providerName" /></label>
          {detail.sensitiveVisible && <label>Custo<input type="number" name="cost" min="0" step="0.01" /></label>}
          <label>Descrição<textarea name="description" rows={2} /></label>
          <button className="button button-secondary">Registrar manutenção</button>
        </form>}
      </aside>
    </div>

    <section className="card card-pad">
      <span className="eyebrow">HISTÓRICO DE CUSTÓDIA</span>
      <h2>Entregas e devoluções</h2>
      <div className="report-table-wrap"><table className="data-table"><thead><tr><th>Obra</th><th>Equipe/Responsável</th><th>Entrega</th><th>Retorno</th><th>Status</th><th>Condições</th></tr></thead><tbody>
        {detail.custodies.map(custody => <tr key={custody.id}>
          <td>{custody.projectName ?? "—"}</td>
          <td>{custody.teamName ?? custody.responsibleName ?? "Usuário interno"}</td>
          <td>{new Date(custody.assignedAt).toLocaleString("pt-BR")}</td>
          <td>{custody.returnedAt ? new Date(custody.returnedAt).toLocaleString("pt-BR") : "—"}</td>
          <td>{custody.status}</td>
          <td>{custody.assignedCondition || "—"}{custody.returnedCondition ? ` → ${custody.returnedCondition}` : ""}</td>
        </tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
