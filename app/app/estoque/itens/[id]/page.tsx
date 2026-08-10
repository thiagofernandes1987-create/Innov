import Link from "next/link";
import { updateInventoryItem } from "@/app/actions/inventory";
import { createInventoryLot } from "@/app/actions/inventory-extra";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { formatInventoryCurrency, formatInventoryQuantity, movementLabel } from "@/lib/inventory/domain";
import { loadInventoryDashboard } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

type ItemDetail = {
  sensitiveVisible: boolean;
  item: {
    id: string;
    categoryId: string | null;
    unitId: string;
    code: string;
    sku: string | null;
    barcode: string | null;
    name: string;
    description: string;
    specification: string;
    kind: string;
    minimumStock: number;
    referenceUnitCost: number | null;
    controlsLot: boolean;
    controlsExpiry: boolean;
    controlsIndividualAsset: boolean;
    active: boolean;
  };
  lots: Array<{
    id: string;
    batchNumber: string;
    manufacturedOn: string | null;
    expiresOn: string | null;
    notes: string;
    active: boolean;
    supplierName: string | null;
  }>;
  movements: Array<{
    id: string;
    quantityDelta: number;
    unitCost: number | null;
    totalCost: number | null;
    notes: string;
    movementId: string;
    movementCode: string;
    movementType: string;
    movementStatus: string;
    occurredAt: string;
    warehouseName: string;
    locationName: string | null;
    batchNumber: string | null;
  }>;
};

export default async function InventoryItemDetail({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("estoque", "read");

  const [{ data, error }, { data: units }, { data: categories }, { data: suppliers }, { dashboard }] = await Promise.all([
    context.supabase.rpc("get_inventory_item_detail", { p_item_id: id }),
    context.supabase.from("inventory_units").select("id,code,name").eq("organization_id", context.organizationId).eq("active", true).order("name"),
    context.supabase.from("inventory_categories").select("id,code,name").eq("organization_id", context.organizationId).eq("active", true).order("name"),
    context.supabase.from("procurement_suppliers").select("id,legal_name").eq("organization_id", context.organizationId).eq("status", "ACTIVE").order("legal_name"),
    loadInventoryDashboard()
  ]);

  if (error) reportDataAccessError("inventory.item-detail.load", error);
  if (error || !data) {
    return <main className="content inventory-app"><div className="empty-state"><h1>Item não encontrado</h1><p>Registro indisponível.</p></div></main>;
  }

  const detail = data as ItemDetail;
  const item = detail.item;
  const unit = (units ?? []).find(value => value.id === item.unitId);
  const category = (categories ?? []).find(value => value.id === item.categoryId);
  const total = dashboard.items.find(value => value.id === id);
  const canUpdate = await hasCapability("estoque", "update", null, context);

  return <main className="content inventory-app">
    <Link className="back-link" href="/app/estoque/itens">← Itens</Link>
    <section className="page-heading">
      <div>
        <span className="badge">{item.code} · {item.kind}</span>
        <h1>{item.name}</h1>
        <p>{item.description || "Item controlado pelo módulo de estoque."}</p>
      </div>
      <Link className="button button-secondary" href={`/app/estoque/movimentos/novo?itemId=${id}`}>Movimentar</Link>
    </section>
    <InventoryNavigation />
    {query.error && <div className="validation blocking">{query.error}</div>}

    <section className="stats-grid inventory-stats">
      <article className="card"><small>FÍSICO</small><strong>{formatInventoryQuantity(total?.physicalQuantity ?? 0, unit?.code)}</strong><span>saldo postado</span></article>
      <article className="card"><small>RESERVADO</small><strong>{formatInventoryQuantity(total?.reservedQuantity ?? 0, unit?.code)}</strong><span>reservas ativas</span></article>
      <article className="card"><small>DISPONÍVEL</small><strong className={total?.belowMinimum ? "inventory-health-critical" : "inventory-health-ok"}>{formatInventoryQuantity(total?.availableQuantity ?? 0, unit?.code)}</strong><span>mínimo {formatInventoryQuantity(item.minimumStock, unit?.code)}</span></article>
      <article className="card"><small>VALOR ESTIMADO</small><strong>{formatInventoryCurrency(total?.stockValue)}</strong><span>{detail.sensitiveVisible ? "custo por movimentos" : "acesso restrito"}</span></article>
    </section>

    <div className="inventory-two-column">
      <section className="card card-pad">
        <span className="eyebrow">CONFIGURAÇÃO</span>
        <h2>Dados do item</h2>
        {canUpdate ? <form action={updateInventoryItem} className="inventory-form">
          <input type="hidden" name="itemId" value={id} />
          <div className="form-grid form-grid-2">
            <label>Nome<input name="name" defaultValue={item.name} required /></label>
            <label>Tipo<select name="kind" defaultValue={item.kind}><option value="MATERIAL">Material</option><option value="CONSUMABLE">Consumível</option><option value="TOOL">Ferramenta</option><option value="ASSET">Ativo</option></select></label>
            <label>Categoria<select name="categoryId" defaultValue={category?.id ?? ""}><option value="">Sem categoria</option>{(categories ?? []).map(value => <option key={value.id} value={value.id}>{value.code} · {value.name}</option>)}</select></label>
            <label>Unidade<select name="unitId" defaultValue={unit?.id ?? ""} required>{(units ?? []).map(value => <option key={value.id} value={value.id}>{value.code} · {value.name}</option>)}</select></label>
            <label>SKU<input name="sku" defaultValue={item.sku ?? ""} /></label>
            <label>Código de barras<input name="barcode" defaultValue={item.barcode ?? ""} /></label>
            <label>Estoque mínimo<input type="number" name="minimumStock" min="0" step="0.0001" defaultValue={item.minimumStock} /></label>
            {detail.sensitiveVisible && <label>Custo de referência<input type="number" name="referenceUnitCost" min="0" step="0.0001" defaultValue={item.referenceUnitCost ?? ""} /></label>}
          </div>
          <label>Descrição<textarea name="description" rows={3} defaultValue={item.description} /></label>
          <label>Especificação<textarea name="specification" rows={3} defaultValue={item.specification} /></label>
          <div className="inventory-check-grid">
            <label className="checkbox-row"><input type="checkbox" name="controlsLot" defaultChecked={item.controlsLot} /> Lote</label>
            <label className="checkbox-row"><input type="checkbox" name="controlsExpiry" defaultChecked={item.controlsExpiry} /> Validade</label>
            <label className="checkbox-row"><input type="checkbox" name="controlsIndividualAsset" defaultChecked={item.controlsIndividualAsset} /> Individualizado</label>
            <label className="checkbox-row"><input type="checkbox" name="active" defaultChecked={item.active} /> Ativo</label>
          </div>
          <button className="button button-primary">Salvar alterações</button>
        </form> : <dl className="detail-list">
          <div><dt>Categoria</dt><dd>{category?.name ?? "—"}</dd></div>
          <div><dt>Unidade</dt><dd>{unit?.name ?? "—"}</dd></div>
          <div><dt>SKU</dt><dd>{item.sku ?? "—"}</dd></div>
          <div><dt>Controle de lote</dt><dd>{item.controlsLot ? "Sim" : "Não"}</dd></div>
        </dl>}
      </section>

      <aside className="card card-pad">
        <span className="eyebrow">LOTES</span>
        <h2>Rastreabilidade</h2>
        <div className="inventory-list">
          {detail.lots.map(lot => <article className="inventory-row" key={lot.id}>
            <div><strong>{lot.batchNumber}</strong><small>{lot.expiresOn ? `Validade ${new Date(`${lot.expiresOn}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem validade"}{lot.supplierName ? ` · ${lot.supplierName}` : ""}</small></div>
            <span className="badge">{lot.active ? "ATIVO" : "INATIVO"}</span>
          </article>)}
          {!detail.lots.length && <div className="empty-state"><p>Nenhum lote cadastrado.</p></div>}
        </div>
        {canUpdate && item.controlsLot && <form action={createInventoryLot} className="inventory-form compact-form">
          <input type="hidden" name="itemId" value={id} />
          <label>Lote<input name="batchNumber" required /></label>
          <div className="form-grid form-grid-2"><label>Fabricação<input type="date" name="manufacturedOn" /></label><label>Validade<input type="date" name="expiresOn" /></label></div>
          <label>Fornecedor<select name="supplierId"><option value="">Não informado</option>{(suppliers ?? []).map(value => <option key={value.id} value={value.id}>{value.legal_name}</option>)}</select></label>
          <label>Observação<input name="notes" /></label>
          <button className="button button-secondary">Adicionar lote</button>
        </form>}
      </aside>
    </div>

    <section className="card card-pad report-table-wrap">
      <div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Movimentos do item</h2></div></div>
      <table className="data-table"><thead><tr><th>Movimento</th><th>Depósito</th><th>Localização</th><th>Lote</th><th>Quantidade</th><th>Custo</th></tr></thead><tbody>
        {detail.movements.map(line => <tr key={line.id}>
          <td><Link className="text-link" href={`/app/estoque/movimentos/${line.movementId}`}>{line.movementCode} · {movementLabel(line.movementType)}</Link><small>{line.movementStatus}</small></td>
          <td>{line.warehouseName}</td>
          <td>{line.locationName ?? "—"}</td>
          <td>{line.batchNumber ?? "—"}</td>
          <td className={line.quantityDelta < 0 ? "inventory-negative" : "inventory-positive"}>{formatInventoryQuantity(line.quantityDelta, unit?.code)}</td>
          <td>{formatInventoryCurrency(line.totalCost)}</td>
        </tr>)}
      </tbody></table>
      {!detail.movements.length && <div className="empty-state"><h3>Sem movimentos</h3><p>O histórico aparecerá após a primeira entrada.</p></div>}
    </section>
  </main>;
}
