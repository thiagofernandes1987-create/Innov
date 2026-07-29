"use client";

import { useActionState, useState } from "react";
import { createFlexibleProject } from "@/app/actions/flexible-workflows";
import { INITIAL_PROJECT_CREATION_STATE } from "@/lib/forms/project-creation-state";
import {
  PROJECT_STATUSES_BY_MODE,
  type ProjectEntryMode
} from "@/lib/projects/project-creation";

export type ProjectClientOption = {
  id: string;
  label: string;
};

export type ProjectManagerOption = {
  id: string;
  label: string;
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  ACTIVE: "Ativa",
  IN_PROGRESS: "Em andamento",
  ON_HOLD: "Pausada",
  COMPLETED: "Concluída"
};

export function ProjectEntryForm({
  clients,
  managers,
  clientsAvailable = true,
  managersAvailable = true
}: {
  clients: ProjectClientOption[];
  managers: ProjectManagerOption[];
  clientsAvailable?: boolean;
  managersAvailable?: boolean;
}) {
  const [entryMode, setEntryMode] = useState<ProjectEntryMode>("INDEPENDENT");
  const [state, formAction, pending] = useActionState(
    createFlexibleProject,
    INITIAL_PROJECT_CREATION_STATE
  );
  const needsCutoff = ["IN_PROGRESS", "HISTORICAL", "IMPORTED"].includes(entryMode);
  const needsActualStart = ["IN_PROGRESS", "HISTORICAL"].includes(entryMode);
  const statusOptions = PROJECT_STATUSES_BY_MODE[entryMode];
  const defaultStatus = entryMode === "IN_PROGRESS"
    ? "IN_PROGRESS"
    : entryMode === "HISTORICAL"
      ? "COMPLETED"
      : "PLANNING";

  function fieldError(name: keyof typeof state.fieldErrors) {
    const message = state.fieldErrors[name];
    return message ? <small className="field-error" role="alert">{message}</small> : null;
  }

  return (
    <form action={formAction} className="card card-pad field-form project-entry-form" noValidate>
      {state.status === "error" ? (
        <div className="validation blocking span-2" role="alert" key={state.attempt}>
          {state.message}
        </div>
      ) : null}

      <fieldset className="workflow-choice span-2">
        <legend>Como esta obra ou projeto está entrando no Innovar?</legend>
        {[
          ["INDEPENDENT", "Projeto independente", "Planejamento novo, sem proposta, orçamento ou contrato obrigatório."],
          ["IN_PROGRESS", "Obra já em andamento", "Implanta o saldo da obra com data de corte e avanço atual."],
          ["HISTORICAL", "Obra concluída para histórico", "Preserva cadastro, documentos e custos anteriores ao aplicativo."],
          ["IMPORTED", "Importar de outro sistema", "Registra a origem e a data de corte da migração."]
        ].map(([value, title, description]) => (
          <label key={value} className={entryMode === value ? "workflow-choice-active" : ""}>
            <input
              type="radio"
              name="entryMode"
              value={value}
              checked={entryMode === value}
              onChange={() => setEntryMode(value as ProjectEntryMode)}
            />
            <span><strong>{title}</strong><small>{description}</small></span>
          </label>
        ))}
        {fieldError("entryMode")}
      </fieldset>

      {!clientsAvailable ? (
        <div className="validation span-2">Clientes não puderam ser carregados. O projeto pode ser criado sem cliente e vinculado depois.</div>
      ) : null}
      {!managersAvailable ? (
        <div className="validation span-2">Responsáveis não puderam ser carregados. A atribuição poderá ser feita depois.</div>
      ) : null}

      <div className="field-grid">
        <label>Cliente opcional
          <select name="clientId" defaultValue="" disabled={!clientsAvailable} aria-invalid={Boolean(state.fieldErrors.clientId)}>
            <option value="">Sem cliente definido</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
          </select>
          {fieldError("clientId")}
        </label>
        <label>Responsável
          <select name="managerId" defaultValue="" disabled={!managersAvailable} aria-invalid={Boolean(state.fieldErrors.managerId)}>
            <option value="">Atribuir depois</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}</option>)}
          </select>
          {fieldError("managerId")}
        </label>
        <label>Código
          <input name="code" placeholder="OBR-2026-001" required aria-invalid={Boolean(state.fieldErrors.code)} />
          {fieldError("code")}
        </label>
        <label>Nome da obra/projeto
          <input name="name" placeholder="Residência Alto Capivari" required aria-invalid={Boolean(state.fieldErrors.name)} />
          {fieldError("name")}
        </label>
        <label>Situação inicial
          <select name="status" defaultValue={defaultStatus} key={entryMode} aria-invalid={Boolean(state.fieldErrors.status)}>
            {statusOptions.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          {fieldError("status")}
        </label>
        <label>Progresso atual (%)
          <input
            key={`progress-${entryMode}`}
            name="progressPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={entryMode === "HISTORICAL" ? "100" : "0"}
            readOnly={entryMode === "HISTORICAL"}
            aria-invalid={Boolean(state.fieldErrors.progressPercent)}
          />
          {fieldError("progressPercent")}
        </label>
        <label>Início planejado
          <input type="date" name="plannedStart" aria-invalid={Boolean(state.fieldErrors.plannedStart)} />
          {fieldError("plannedStart")}
        </label>
        <label>Término planejado
          <input type="date" name="plannedEnd" aria-invalid={Boolean(state.fieldErrors.plannedEnd)} />
          {fieldError("plannedEnd")}
        </label>
        <label>Início real
          <input type="date" name="actualStart" required={needsActualStart} aria-invalid={Boolean(state.fieldErrors.actualStart)} />
          {fieldError("actualStart")}
        </label>
        <label>Data de corte
          <input type="date" name="dataCutoff" required={needsCutoff} aria-invalid={Boolean(state.fieldErrors.dataCutoff)} />
          <small className="field-help">Obrigatória para obra existente, histórica ou importada.</small>
          {fieldError("dataCutoff")}
        </label>
        <label>Custo histórico conhecido
          <input name="historicalCost" inputMode="decimal" placeholder="0,00" aria-invalid={Boolean(state.fieldErrors.historicalCost)} />
          {fieldError("historicalCost")}
        </label>
        <label>Origem da importação
          <input
            name="importedFrom"
            placeholder="Planilha, ERP anterior, arquivo físico"
            required={entryMode === "IMPORTED"}
            disabled={entryMode !== "IMPORTED"}
            aria-invalid={Boolean(state.fieldErrors.importedFrom)}
          />
          {fieldError("importedFrom")}
        </label>
        <label className="span-2">Descrição<textarea name="description" rows={3} placeholder="Escopo inicial, situação atual e observações da implantação." /></label>
        <label className="span-2">Endereço<input name="addressLine" placeholder="Rua, número e complemento" /></label>
        <label>Cidade<input name="city" placeholder="Campos do Jordão" /></label>
        <label>Bairro<input name="district" placeholder="Capivari" /></label>
        <label>Estado
          <input name="state" defaultValue="SP" maxLength={2} aria-invalid={Boolean(state.fieldErrors.state)} />
          {fieldError("state")}
        </label>
        <label>CEP
          <input name="postalCode" inputMode="numeric" placeholder="12460-000" aria-invalid={Boolean(state.fieldErrors.postalCode)} />
          {fieldError("postalCode")}
        </label>
      </div>

      <div className="validation">
        Proposta, orçamento e contrato podem ser vinculados posteriormente. Nenhum documento fictício será criado para liberar o planejamento.
      </div>
      <div className="proposal-form-footer">
        <span className="muted">Em caso de validação, os dados permanecem no formulário.</span>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Criando projeto..." : "Criar e iniciar planejamento"}
        </button>
      </div>
    </form>
  );
}
