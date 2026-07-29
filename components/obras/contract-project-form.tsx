"use client";

import { useActionState } from "react";
import { createProjectFromContractSafe } from "@/app/actions/project-creation";
import { INITIAL_PROJECT_CREATION_STATE } from "@/lib/forms/project-creation-state";

export type ContractProjectOption = {
  id: string;
  label: string;
};

export function ContractProjectForm({ contracts }: { contracts: ContractProjectOption[] }) {
  const [state, formAction, pending] = useActionState(
    createProjectFromContractSafe,
    INITIAL_PROJECT_CREATION_STATE
  );

  function fieldError(name: keyof typeof state.fieldErrors) {
    const message = state.fieldErrors[name];
    return message ? <small className="field-error" role="alert">{message}</small> : null;
  }

  if (!contracts.length) {
    return (
      <section className="card card-pad">
        <strong>Nenhum contrato disponível para conversão.</strong>
        <p className="muted">Contratos já vinculados, em rascunho ou sem assinatura não aparecem nesta entrada.</p>
      </section>
    );
  }

  return (
    <form action={formAction} className="card card-pad field-form" noValidate>
      {state.status === "error" ? (
        <div className="validation blocking span-2" role="alert" key={state.attempt}>{state.message}</div>
      ) : null}

      <label>Contrato assinado ou ativo
        <select name="contractId" required defaultValue="" aria-invalid={Boolean(state.fieldErrors.contractId)}>
          <option value="">Selecione</option>
          {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.label}</option>)}
        </select>
        {fieldError("contractId")}
      </label>

      <div className="field-grid">
        <label>Código da obra
          <input name="code" placeholder="OBR-2026-001" required aria-invalid={Boolean(state.fieldErrors.code)} />
          {fieldError("code")}
        </label>
        <label>Nome da obra
          <input name="name" placeholder="Residência Alto Capivari" required aria-invalid={Boolean(state.fieldErrors.name)} />
          {fieldError("name")}
        </label>
        <label>Início planejado
          <input type="date" name="plannedStart" required aria-invalid={Boolean(state.fieldErrors.plannedStart)} />
          {fieldError("plannedStart")}
        </label>
        <label>Término planejado
          <input type="date" name="plannedEnd" required aria-invalid={Boolean(state.fieldErrors.plannedEnd)} />
          {fieldError("plannedEnd")}
        </label>
        <label className="span-2">Endereço<input name="addressLine" placeholder="Rua, número e complemento" /></label>
        <label>Cidade<input name="city" defaultValue="Campos do Jordão" /></label>
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

      <div className="validation">Somente contratos assinados, ativos ou aditados e ainda sem obra vinculada aparecem nesta lista.</div>
      <div className="proposal-form-footer">
        <span className="muted">Em caso de conflito ou validação, o preenchimento será preservado.</span>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Criando obra..." : "Criar obra pelo contrato"}
        </button>
      </div>
    </form>
  );
}
