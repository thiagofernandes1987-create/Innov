"use client";

import { useActionState } from "react";
import {
  createCrmOpportunitySafe,
  type OpportunityCreationState
} from "@/app/actions/crm-opportunities";

export type OpportunityClientOption = {
  id: string;
  label: string;
  city?: string | null;
};

export type OpportunityLeadOption = {
  id: string;
  label: string;
  company?: string | null;
  code?: string | null;
};

const INITIAL_STATE: OpportunityCreationState = { status: "idle" };

export function OpportunityForm({
  clients,
  leads,
  initialClientId = "",
  initialLeadId = ""
}: {
  clients: OpportunityClientOption[];
  leads: OpportunityLeadOption[];
  initialClientId?: string;
  initialLeadId?: string;
}) {
  const [state, action, pending] = useActionState(createCrmOpportunitySafe, INITIAL_STATE);

  return (
    <form action={action} className="card card-pad relationship-form">
      {state.status === "error" ? (
        <div className="validation blocking" role="alert">{state.message}</div>
      ) : null}

      <div className="form-grid">
        <label>
          <span>Cliente</span>
          <select name="clientId" defaultValue={initialClientId}>
            <option value="">Sem cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}{client.city ? ` · ${client.city}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lead</span>
          <select name="leadId" defaultValue={initialLeadId}>
            <option value="">Sem lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.code ? `${lead.code} · ` : ""}{lead.label}{lead.company ? ` · ${lead.company}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2"><span>Título *</span><input name="title" required /></label>
        <label><span>Estágio inicial</span><select name="stage" defaultValue="PROSPECTING"><option value="PROSPECTING">Prospecção</option><option value="QUALIFIED">Qualificada</option><option value="PROPOSAL">Proposta</option><option value="NEGOTIATION">Negociação</option></select></label>
        <label><span>Probabilidade (%)</span><input name="probability" type="number" min="0" max="100" step="0.01" defaultValue="25" /></label>
        <label><span>Valor estimado</span><input name="estimatedValue" type="number" inputMode="decimal" min="0" step="0.01" placeholder="150.000,00" /></label>
        <label><span>Fechamento previsto</span><input name="expectedCloseDate" type="date" /></label>
        <label><span>Origem</span><input name="source" /></label>
      </div>
      <label><span>Descrição</span><textarea name="description" rows={5} /></label>
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Criando oportunidade…" : "Criar oportunidade"}
        </button>
      </div>
    </form>
  );
}
