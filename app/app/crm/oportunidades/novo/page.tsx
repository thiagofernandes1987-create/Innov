import { OpportunityForm } from "@/components/relationship/opportunity-form";
import { RelationshipNavigation } from "@/components/relationship/relationship-navigation";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const context = await requireCapability("crm", "create");
  const query = await searchParams;
  const [clientsResult, leadsResult] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id,legal_name,trade_name,city")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("legal_name"),
    context.supabase
      .from("crm_leads")
      .select("id,code,full_name,company_name")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(250)
  ]);

  reportDataAccessError("new-opportunity.clients", clientsResult.error);
  reportDataAccessError("new-opportunity.leads", leadsResult.error);

  const clients = (clientsResult.data ?? []).map((client) => ({
    id: client.id,
    label: client.trade_name || client.legal_name,
    city: client.city
  }));
  const leads = (leadsResult.data ?? []).map((lead) => ({
    id: lead.id,
    label: lead.full_name,
    company: lead.company_name,
    code: lead.code
  }));
  const initialClientId = clients.some((client) => client.id === query.clientId) ? query.clientId : "";
  const initialLeadId = leads.some((lead) => lead.id === query.leadId) ? query.leadId : "";

  return (
    <main className="content relationship-app">
      <section className="page-heading">
        <div>
          <span className="badge">CRM · NOVA OPORTUNIDADE</span>
          <h1>Criar oportunidade</h1>
          <p>Vincule a um cliente ou lead e defina valor, probabilidade e previsão.</p>
        </div>
      </section>
      <RelationshipNavigation />
      {clientsResult.error || leadsResult.error ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}
      <OpportunityForm
        clients={clients}
        leads={leads}
        initialClientId={initialClientId}
        initialLeadId={initialLeadId}
      />
    </main>
  );
}
