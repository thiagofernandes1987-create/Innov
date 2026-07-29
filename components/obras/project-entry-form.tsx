"use client";

import { useState } from "react";
import { createFlexibleProject } from "@/app/actions/flexible-workflows";

export type ProjectClientOption = {
  id: string;
  label: string;
};

export type ProjectManagerOption = {
  id: string;
  label: string;
};

export function ProjectEntryForm({
  clients,
  managers
}: {
  clients: ProjectClientOption[];
  managers: ProjectManagerOption[];
}) {
  const [entryMode, setEntryMode] = useState("INDEPENDENT");
  const needsCutoff = ["IN_PROGRESS", "HISTORICAL", "IMPORTED"].includes(entryMode);

  return (
    <form action={createFlexibleProject} className="card card-pad field-form project-entry-form">
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
              onChange={() => setEntryMode(value)}
            />
            <span><strong>{title}</strong><small>{description}</small></span>
          </label>
        ))}
      </fieldset>

      <div className="field-grid">
        <label>Cliente opcional
          <select name="clientId" defaultValue="">
            <option value="">Sem cliente definido</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
          </select>
        </label>
        <label>Responsável
          <select name="managerId" defaultValue="">
            <option value="">Atribuir depois</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}</option>)}
          </select>
        </label>
        <label>Código<input name="code" placeholder="OBR-2026-001" required /></label>
        <label>Nome da obra/projeto<input name="name" placeholder="Residência Alto Capivari" required /></label>
        <label>Situação inicial
          <select name="status" defaultValue={entryMode === "IN_PROGRESS" ? "IN_PROGRESS" : entryMode === "HISTORICAL" ? "COMPLETED" : "PLANNING"} key={entryMode}>
            <option value="PLANNING">Planejamento</option>
            <option value="ACTIVE">Ativa</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="ON_HOLD">Pausada</option>
            <option value="COMPLETED">Concluída</option>
          </select>
        </label>
        <label>Progresso atual (%)
          <input name="progressPercent" type="number" min="0" max="100" step="0.01" defaultValue="0" />
        </label>
        <label>Início planejado<input type="date" name="plannedStart" /></label>
        <label>Término planejado<input type="date" name="plannedEnd" /></label>
        <label>Início real<input type="date" name="actualStart" /></label>
        <label>Data de corte
          <input type="date" name="dataCutoff" required={needsCutoff} />
          <small className="field-help">Obrigatória para obra existente, histórica ou importada.</small>
        </label>
        <label>Custo histórico conhecido
          <input name="historicalCost" type="number" min="0" step="0.01" placeholder="0,00" />
        </label>
        <label>Origem da importação
          <input name="importedFrom" placeholder="Planilha, ERP anterior, arquivo físico" required={entryMode === "IMPORTED"} />
        </label>
        <label className="span-2">Descrição<textarea name="description" rows={3} placeholder="Escopo inicial, situação atual e observações da implantação." /></label>
        <label className="span-2">Endereço<input name="addressLine" placeholder="Rua, número e complemento" /></label>
        <label>Cidade<input name="city" placeholder="Campos do Jordão" /></label>
        <label>Bairro<input name="district" placeholder="Capivari" /></label>
        <label>Estado<input name="state" defaultValue="SP" maxLength={2} /></label>
        <label>CEP<input name="postalCode" placeholder="12460-000" /></label>
      </div>

      <div className="validation">
        Proposta, orçamento e contrato podem ser vinculados posteriormente. Nenhum documento fictício será criado para liberar o planejamento.
      </div>
      <div className="proposal-form-footer">
        <span className="muted">A obra será aberta imediatamente no Planejamento.</span>
        <button className="button button-primary" type="submit">Criar e iniciar planejamento</button>
      </div>
    </form>
  );
}
