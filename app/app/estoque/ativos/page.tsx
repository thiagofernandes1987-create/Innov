import Link from "next/link";
import { createInventoryAsset } from "@/app/actions/inventory";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { loadInventoryDashboard } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

export default async function InventoryAssetsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const context = await requireCapability("estoque", "read");
  const canCreate = await hasCapability("estoque", "create", null, context);
  const canSensitive = await hasCapability("estoque", "view_sensitive_financials", null, context);

  const [{ dashboard }, { data: items }, { data: warehouses }] = await Promise.all([
    loadInventoryDashboard(),
    context.supabase.from("inventory_items").select("id,code,name,inventory_lots(id,batch_number)").eq("organization_id", context.organizationId).eq("active", true).eq("controls_individual_asset", true).order("name"),
    context.supabase.from("inventory_warehouses").select("id,name,project_id,inventory_locations(id,name)").eq("organization_id", context.organizationId).eq("active", true).order("name")
  ]);

  return <main className="content inventory-app">
    <section className="page-heading">
      <div><span className="badge">ESTOQUE · PATRIMÔNIO</span><h1>Ferramentas e ativos</h1><p>Controle individual por patrimônio ou série, custódia, devolução e manutenção.</p></div>
    </section>
    <InventoryNavigation />
    {query.error && <div className="validation blocking">{query.error}</div>}

    <section className="inventory-asset-grid">
      {dashboard.assets.map(asset => <Link className="card card-pad inventory-asset-card" href={`/app/estoque/ativos/${asset.asset_id}`} key={asset.asset_id}>
        <header><div><span className="eyebrow">{asset.item_code} · {asset.status}</span><h2>{asset.item_name}</h2></div>{asset.return_overdue && <span className="badge badge-danger">DEVOLUÇÃO ATRASADA</span>}</header>
        <dl className="detail-list">
          <div><dt>Patrimônio</dt><dd>{asset.patrimony_code ?? "—"}</dd></div>
          <div><dt>Série</dt><dd>{asset.serial_number ?? "—"}</dd></div>
          <div><dt>Local atual</dt><dd>{asset.warehouse_name ?? asset.project_name ?? "—"}</dd></div>
          <div><dt>Responsável</dt><dd>{asset.team_name ?? asset.responsible_name ?? "Disponível"}</dd></div>
          <div><dt>Retorno esperado</dt><dd>{asset.expected_return_at ? new Date(asset.expected_return_at).toLocaleString("pt-BR") : "—"}</dd></div>
        </dl>
      </Link>)}
      {!dashboard.assets.length && <div className="empty-state"><h3>Nenhum ativo individualizado</h3><p>Cadastre primeiro um item marcado para controle individual.</p></div>}
    </section>

    {canCreate && <form action={createInventoryAsset} className="card card-pad inventory-form">
      <div className="section-heading"><div><span className="eyebrow">NOVO ATIVO</span><h2>Cadastrar e gerar entrada física</h2></div></div>
      <div className="form-grid form-grid-3">
        <label>Item<select name="itemId" required><option value="">Selecione</option>{(items ?? []).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>Depósito<select name="warehouseId" required><option value="">Selecione</option>{(warehouses ?? []).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
        <label>Localização<select name="locationId"><option value="">Localização padrão/não informada</option>{(warehouses ?? []).flatMap(value => (value.inventory_locations ?? []).map(location => <option key={location.id} value={location.id}>{value.name} · {location.name}</option>))}</select></label>
        <label>Patrimônio<input name="patrimonyCode" /></label>
        <label>Número de série<input name="serialNumber" /></label>
        <label>Data de aquisição<input type="date" name="acquiredOn" /></label>
        {canSensitive && <label>Custo de aquisição<input type="number" min="0" step="0.01" name="acquisitionCost" /></label>}
      </div>
      <label>Condição inicial<textarea name="condition" rows={3} /></label>
      <button className="button button-primary">Cadastrar ativo e entrada</button>
    </form>}
  </main>;
}
