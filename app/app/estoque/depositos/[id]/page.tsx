import Link from "next/link";
import { createInventoryLocation } from "@/app/actions/inventory";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { formatInventoryCurrency, formatInventoryQuantity, movementLabel } from "@/lib/inventory/domain";
import { loadInventoryDashboard } from "@/lib/inventory/server";

export const dynamic = "force-dynamic";

type WarehouseLocation = {
  id: string;
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  active: boolean;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function InventoryWarehouseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("estoque", "read");
  const { data: warehouse, error } = await context.supabase.from("inventory_warehouses").select("*,projects(id,code,name),inventory_locations(id,code,name,description,is_default,active)").eq("id", id).eq("organization_id", context.organizationId).single();

  if (error || !warehouse) return <main className="content inventory-app"><div className="empty-state"><h1>Depósito não encontrado</h1></div></main>;

  const project = one(warehouse.projects);
  const locations = (warehouse.inventory_locations ?? []) as WarehouseLocation[];
  const canCreate = await hasCapability("estoque", "create", project?.id ?? null, context);
  const { dashboard } = await loadInventoryDashboard({ projectId: project?.id ?? null, warehouseId: id });
  const summary = dashboard.warehouses[0];

  return <main className="content inventory-app">
    <Link className="back-link" href="/app/estoque/depositos">← Depósitos</Link>
    <section className="page-heading"><div><span className="badge">{warehouse.code} · {warehouse.kind}</span><h1>{warehouse.name}</h1><p>{project ? `${project.code} · ${project.name}` : "Almoxarifado sem obra específica"}{warehouse.address ? ` · ${warehouse.address}` : ""}</p></div><div className="page-actions"><Link className="button button-secondary" href={`/app/estoque/inventarios/novo?warehouseId=${id}`}>Iniciar inventário</Link><Link className="button button-primary" href={`/app/estoque/movimentos/novo?warehouseId=${id}`}>Novo movimento</Link></div></section>
    <InventoryNavigation />
    {query.error && <div className="validation blocking">{query.error}</div>}
    <section className="stats-grid inventory-stats"><article className="card"><small>FÍSICO</small><strong>{formatInventoryQuantity(summary?.physicalQuantity ?? 0)}</strong><span>movimentos postados</span></article><article className="card"><small>RESERVADO</small><strong>{formatInventoryQuantity(summary?.reservedQuantity ?? 0)}</strong><span>reservas ativas</span></article><article className="card"><small>DISPONÍVEL</small><strong>{formatInventoryQuantity(summary?.availableQuantity ?? 0)}</strong><span>saldo utilizável</span></article><article className="card"><small>VALOR</small><strong>{formatInventoryCurrency(summary?.stockValue)}</strong><span>estimativa por custo</span></article></section>
    <div className="inventory-two-column">
      <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">SALDO DO DEPÓSITO</span><h2>Itens armazenados</h2></div></div><div className="inventory-list">{dashboard.items.filter(item => item.physicalQuantity !== 0 || item.reservedQuantity !== 0).map(item => <Link className="inventory-row" href={`/app/estoque/itens/${item.id}`} key={item.id}><div><strong>{item.code} · {item.name}</strong><small>{item.kind} · mínimo {formatInventoryQuantity(item.minimumStock, item.unitCode)}</small></div><div><strong className={item.belowMinimum ? "inventory-health-critical" : ""}>{formatInventoryQuantity(item.availableQuantity, item.unitCode)}</strong><small>{formatInventoryCurrency(item.stockValue)}</small></div></Link>)}{!dashboard.items.some(item => item.physicalQuantity !== 0 || item.reservedQuantity !== 0) && <div className="empty-state"><h3>Depósito sem saldo</h3><p>Registre uma entrada ou importe um recebimento.</p></div>}</div></section>
      <aside className="card card-pad"><span className="eyebrow">LOCALIZAÇÕES</span><h2>Endereços internos</h2><div className="inventory-list">{locations.map(location => <article className="inventory-row" key={location.id}><div><strong>{location.code} · {location.name}</strong><small>{location.description || "Sem descrição"}</small></div><span className="badge">{location.is_default ? "PADRÃO" : location.active ? "ATIVA" : "INATIVA"}</span></article>)}</div>{canCreate && <form action={createInventoryLocation} className="inventory-form compact-form"><input type="hidden" name="warehouseId" value={id} /><input type="hidden" name="projectId" value={project?.id ?? ""} /><label>Código<input name="code" required /></label><label>Nome<input name="name" required /></label><label>Descrição<input name="description" /></label><button className="button button-secondary">Adicionar localização</button></form>}</aside>
    </div>
    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">HISTÓRICO RECENTE</span><h2>Movimentos neste depósito</h2></div><Link className="text-link" href={`/app/estoque/movimentos?warehouseId=${id}`}>Ver todos →</Link></div><div className="inventory-list">{dashboard.recentMovements.map(movement => <Link className="inventory-row" href={`/app/estoque/movimentos/${movement.id}`} key={movement.id}><div><strong>{movement.code} · {movementLabel(movement.movement_type)}</strong><small>{new Date(movement.occurred_at).toLocaleString("pt-BR")} · {movement.reason || "sem motivo"}</small></div><div><span className="badge">{movement.status}</span><strong>{formatInventoryCurrency(movement.total_cost)}</strong></div></Link>)}{!dashboard.recentMovements.length && <div className="empty-state"><p>Nenhum movimento neste depósito.</p></div>}</div></section>
  </main>;
}
