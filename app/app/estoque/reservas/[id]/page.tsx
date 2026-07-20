import Link from "next/link";
import { releaseInventoryReservation } from "@/app/actions/inventory";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { InventoryReservationConsumeForm } from "@/components/inventory/inventory-reservation-consume-form";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { formatInventoryQuantity } from "@/lib/inventory/domain";

export const dynamic = "force-dynamic";

type UnitRelation = { code: string } | { code: string }[] | null;
type ItemRelation = { code: string; name: string; inventory_units: UnitRelation } | Array<{ code: string; name: string; inventory_units: UnitRelation }> | null;
type NameRelation = { name: string } | { name: string }[] | null;
type LotRelation = { batch_number: string } | { batch_number: string }[] | null;

type ReservationLine = {
  id: string;
  line_number: number;
  requested_quantity: number | string;
  reserved_quantity: number | string;
  consumed_quantity: number | string;
  released_quantity: number | string;
  notes: string;
  inventory_items: ItemRelation;
  inventory_locations: NameRelation;
  inventory_lots: LotRelation;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function InventoryReservationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("estoque", "read");
  const { data: reservation, error } = await context.supabase.from("inventory_reservations").select("*,projects(code,name),project_tasks(code,title),inventory_warehouses(name),inventory_reservation_lines(id,line_number,requested_quantity,reserved_quantity,consumed_quantity,released_quantity,notes,inventory_items(code,name,inventory_units(code)),inventory_locations(name),inventory_lots(batch_number))").eq("id", id).eq("organization_id", context.organizationId).single();

  if (error || !reservation) return <main className="content inventory-app"><div className="empty-state"><h1>Reserva não encontrada</h1></div></main>;

  const project = one(reservation.projects);
  const task = one(reservation.project_tasks);
  const warehouse = one(reservation.inventory_warehouses);
  const reservationLines = (reservation.inventory_reservation_lines ?? []) as ReservationLine[];
  const canUpdate = await hasCapability("estoque", "update", reservation.project_id, context);
  const active = ["ACTIVE", "PARTIALLY_CONSUMED"].includes(reservation.status);
  const consumeLines = reservationLines.map(line => {
    const item = one(line.inventory_items);
    const unit = one(item?.inventory_units);
    return {
      id: line.id,
      remaining: Math.max(0, Number(line.reserved_quantity) - Number(line.consumed_quantity) - Number(line.released_quantity)),
      label: `${item?.code ?? ""} · ${item?.name ?? "Item"}`,
      unit: unit?.code ?? "un"
    };
  }).filter(line => line.remaining > 0);

  return <main className="content inventory-app">
    <Link className="back-link" href="/app/estoque/reservas">← Reservas</Link>
    <section className="page-heading"><div><span className="badge">{reservation.code} · {reservation.status}</span><h1>{project ? `${project.code} · ${project.name}` : "Reserva de estoque"}</h1><p>{warehouse?.name ?? "Depósito"}{task ? ` · ${task.code} · ${task.title}` : ""}</p></div></section>
    <InventoryNavigation />
    {query.error && <div className="validation blocking">{query.error}</div>}

    <section className="card card-pad report-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Item</th><th>Localização</th><th>Lote</th><th>Solicitado</th><th>Reservado</th><th>Consumido</th><th>Liberado</th><th>Restante</th></tr></thead><tbody>
      {reservationLines.map(line => {
        const item = one(line.inventory_items);
        const unit = one(item?.inventory_units);
        const location = one(line.inventory_locations);
        const lot = one(line.inventory_lots);
        const remaining = Math.max(0, Number(line.reserved_quantity) - Number(line.consumed_quantity) - Number(line.released_quantity));
        return <tr key={line.id}><td>{line.line_number}</td><td><strong>{item?.code} · {item?.name}</strong><small>{line.notes}</small></td><td>{location?.name ?? "—"}</td><td>{lot?.batch_number ?? "—"}</td><td>{formatInventoryQuantity(Number(line.requested_quantity), unit?.code)}</td><td>{formatInventoryQuantity(Number(line.reserved_quantity), unit?.code)}</td><td>{formatInventoryQuantity(Number(line.consumed_quantity), unit?.code)}</td><td>{formatInventoryQuantity(Number(line.released_quantity), unit?.code)}</td><td>{formatInventoryQuantity(remaining, unit?.code)}</td></tr>;
      })}
    </tbody></table></section>

    <div className="inventory-two-column">
      <section className="card card-pad"><span className="eyebrow">CONDIÇÕES</span><h2>Dados da reserva</h2><dl className="detail-list"><div><dt>Necessidade</dt><dd>{reservation.needed_by ? new Date(`${reservation.needed_by}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</dd></div><div><dt>Expiração</dt><dd>{reservation.expires_at ? new Date(reservation.expires_at).toLocaleString("pt-BR") : "—"}</dd></div><div><dt>Motivo</dt><dd>{reservation.reason || "—"}</dd></div><div><dt>Ativada</dt><dd>{reservation.activated_at ? new Date(reservation.activated_at).toLocaleString("pt-BR") : "—"}</dd></div></dl>{canUpdate && active && <form action={releaseInventoryReservation} className="inventory-form compact-form"><input type="hidden" name="reservationId" value={id} /><input type="hidden" name="projectId" value={reservation.project_id} /><label>Motivo da liberação<input name="reason" required /></label><button className="button button-secondary">Liberar saldo restante</button></form>}</section>
      {canUpdate && active && consumeLines.length > 0 ? <InventoryReservationConsumeForm reservationId={id} projectId={reservation.project_id} lines={consumeLines} /> : <aside className="card card-pad empty-state"><h2>Sem consumo pendente</h2><p>A reserva foi encerrada ou não possui quantidade restante.</p></aside>}
    </div>
  </main>;
}
