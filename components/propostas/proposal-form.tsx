"use client";

import { useMemo, useState } from "react";
import { createFlexibleProposal } from "@/app/actions/flexible-workflows";

export type ProposalBudgetOption = {
  id: string;
  label: string;
  price: number;
  status: string;
  approved: boolean;
};

export type ProposalClientOption = {
  id: string;
  label: string;
  city?: string | null;
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(value) ? value : 0);
}

export function ProposalForm({
  budgets,
  clients
}: {
  budgets: ProposalBudgetOption[];
  clients: ProposalClientOption[];
}) {
  const [pricingMode, setPricingMode] = useState<"BUDGET" | "FIXED">("BUDGET");
  const [budgetVersionId, setBudgetVersionId] = useState("");
  const [fixedValue, setFixedValue] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const selectedBudget = budgets.find((budget) => budget.id === budgetVersionId);
  const basePrice = pricingMode === "BUDGET" ? Number(selectedBudget?.price ?? 0) : fixedValue;
  const discountAmount = useMemo(
    () => Math.round(basePrice * Math.max(0, discountPercent) * 100) / 10000,
    [basePrice, discountPercent]
  );
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const needsApproval = discountPercent > 7;

  return (
    <form
      id="proposal-form"
      action={createFlexibleProposal}
      encType="multipart/form-data"
      className="card card-pad field-form proposal-form"
    >
      <fieldset className="workflow-choice span-2">
        <legend>Como o valor da proposta será formado?</legend>
        <label className={pricingMode === "BUDGET" ? "workflow-choice-active" : ""}>
          <input
            type="radio"
            name="pricingMode"
            value="BUDGET"
            checked={pricingMode === "BUDGET"}
            onChange={() => setPricingMode("BUDGET")}
          />
          <span><strong>Usar orçamento calculado</strong><small>Copia e congela o valor da versão selecionada.</small></span>
        </label>
        <label className={pricingMode === "FIXED" ? "workflow-choice-active" : ""}>
          <input
            type="radio"
            name="pricingMode"
            value="FIXED"
            checked={pricingMode === "FIXED"}
            onChange={() => setPricingMode("FIXED")}
          />
          <span><strong>Definir valor fixo</strong><small>Permite proposta comercial sem orçamento prévio.</small></span>
        </label>
      </fieldset>

      <div className="field-grid">
        {pricingMode === "BUDGET" ? (
          <label className="span-2">Orçamento calculado
            <select
              name="budgetVersionId"
              required
              value={budgetVersionId}
              onChange={(event) => setBudgetVersionId(event.target.value)}
            >
              <option value="">Selecione uma versão calculada</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.label}
                </option>
              ))}
            </select>
            <small className="field-help">
              Versões em aprovação podem gerar rascunho. Somente versões aprovadas podem ser enviadas ao cliente.
            </small>
          </label>
        ) : (
          <>
            <label>Cliente
              <select name="clientId" required defaultValue="">
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.label}{client.city ? ` · ${client.city}` : ""}</option>
                ))}
              </select>
            </label>
            <label>Valor fixo da proposta
              <input
                name="fixedValue"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={fixedValue || ""}
                onChange={(event) => setFixedValue(Number(event.target.value))}
                placeholder="150000,00"
              />
            </label>
          </>
        )}

        <label>Código<input name="code" required placeholder="PROP-2026-001" /></label>
        <label>Validade<input name="validUntil" type="date" /></label>
        <label className="span-2">Título<input name="title" required placeholder="Proposta comercial — execução da obra" /></label>
        <label className="span-2">Objeto<textarea name="objectText" required rows={3} placeholder="O compromisso comercial que esta proposta estabelece." /></label>
        <label className="span-2">Escopo<textarea name="scopeText" required rows={5} placeholder="Entregas, limites e critérios de aceite." /></label>
        <label>Inclusões<textarea name="inclusions" rows={4} /></label>
        <label>Exclusões<textarea name="exclusions" rows={4} /></label>
        <label>Premissas<textarea name="assumptions" rows={4} /></label>
        <label>Resumo comercial<textarea name="commercialSummary" rows={4} /></label>
        <label>Condições de pagamento<textarea name="paymentTerms" rows={3} /></label>
        <label>Prazo<textarea name="deadlineText" rows={3} /></label>
        <label>Garantia<textarea name="warrantyText" rows={3} /></label>
        <label>Notas internas<textarea name="notes" rows={3} /></label>

        <section className="proposal-pricing span-2" aria-label="Preço e desconto">
          <div>
            <span>Valor de origem</span>
            <strong>{currency(basePrice)}</strong>
          </div>
          <label>Desconto (%)
            <input
              name="discountPercent"
              type="number"
              min="0"
              max="99.99"
              step="0.01"
              value={discountPercent || ""}
              onChange={(event) => setDiscountPercent(Number(event.target.value))}
              placeholder="0,00"
            />
          </label>
          <div>
            <span>Desconto</span>
            <strong>- {currency(discountAmount)}</strong>
          </div>
          <div className="proposal-final-price">
            <span>Valor final</span>
            <strong>{currency(finalPrice)}</strong>
          </div>
        </section>

        {needsApproval ? (
          <label className="span-2">Justificativa para desconto acima de 7%
            <textarea name="discountReason" required rows={3} placeholder="Explique a condição comercial e o motivo da exceção." />
            <small className="validation blocking">A proposta será criada em revisão interna e precisará da aprovação da diretoria.</small>
          </label>
        ) : (
          <input type="hidden" name="discountReason" value="" />
        )}

        <label className="span-2 signature-dropzone">PDF final da proposta
          <input name="file" type="file" accept="application/pdf" />
          <small>Opcional para rascunho. Obrigatório para liberar ao cliente. Somente PDF, até 20 MB.</small>
        </label>
      </div>

      <label className="checkline">
        <input name="releaseClient" type="checkbox" disabled={needsApproval || (pricingMode === "BUDGET" && !selectedBudget?.approved)} />
        Liberar esta versão ao portal do cliente assim que for criada
      </label>

      <div className="proposal-form-footer">
        <span className="muted">Até 7%: alçada automática. Acima de 7%: diretoria.</span>
        <button className="button button-primary" type="submit">Criar proposta</button>
      </div>
    </form>
  );
}
