"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createFlexibleProposal,
  prepareProposalUpload,
  type ProposalCreationState
} from "@/app/actions/flexible-workflows";
import { useReencostarNoDom } from "@/lib/forms/reencostar-no-dom";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

type UploadState =
  | { status: "idle"; message: string }
  | { status: "uploading"; message: string }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };

const INITIAL_PROPOSAL_STATE: ProposalCreationState = { status: "idle" };

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
  const [uploadedPath, setUploadedPath] = useState("");

  // A ação devolve erro de campo e o formulário continua montado: é a segunda
  // ida ao servidor que larga o valor no DOM, e é o DOM que vai no envio
  // seguinte (VACINA-051). Os dois numéricos entram como texto porque é assim
  // que o elemento guarda o valor — comparar número com o `value` do campo
  // daria diferente sempre e reescreveria o DOM a cada renderização.
  const campo = useReencostarNoDom({
    budgetVersionId,
    fixedValue: String(fixedValue),
    discountPercent: String(discountPercent)
  });
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    message: "Opcional para rascunho. Obrigatório para liberar ao cliente. Somente PDF, até 20 MB."
  });
  const [creationState, formAction, pending] = useActionState(
    createFlexibleProposal,
    INITIAL_PROPOSAL_STATE
  );

  const selectedBudget = budgets.find((budget) => budget.id === budgetVersionId);
  const basePrice = pricingMode === "BUDGET" ? Number(selectedBudget?.price ?? 0) : fixedValue;
  const discountAmount = useMemo(
    () => Math.round(basePrice * Math.max(0, discountPercent) * 100) / 10000,
    [basePrice, discountPercent]
  );
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const needsApproval = discountPercent > 7;
  const uploadInProgress = uploadState.status === "uploading";
  const pdfReady = uploadState.status === "ready" && Boolean(uploadedPath);

  async function uploadPdf(file: File | undefined) {
    setUploadedPath("");
    if (!file) {
      setUploadState({
        status: "idle",
        message: "Opcional para rascunho. Obrigatório para liberar ao cliente. Somente PDF, até 20 MB."
      });
      return;
    }

    setUploadState({ status: "uploading", message: "Enviando PDF diretamente ao armazenamento seguro…" });
    try {
      const prepared = await prepareProposalUpload({
        name: file.name,
        type: file.type,
        size: file.size
      });
      if (!prepared.ok) {
        setUploadState({ status: "error", message: prepared.message });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const uploaded = await supabase.storage
        .from("commercial-documents")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: "application/pdf",
          upsert: false
        });

      if (uploaded.error) {
        setUploadState({
          status: "error",
          message: "Não foi possível enviar o PDF. Verifique a conexão e selecione o arquivo novamente."
        });
        return;
      }

      setUploadedPath(prepared.path);
      setUploadState({ status: "ready", message: `${file.name} enviado e pronto para vincular à proposta.` });
    } catch {
      setUploadState({
        status: "error",
        message: "Não foi possível preparar o upload do PDF. Tente novamente."
      });
    }
  }

  return (
    <form
      id="proposal-form"
      action={formAction}
      className="card card-pad field-form proposal-form"
    >
      {creationState.status === "error" ? (
        <div className="validation blocking span-2" role="alert">
          {creationState.message}
        </div>
      ) : null}

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
              ref={campo("budgetVersionId")}
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
              Versões em revisão podem gerar rascunho. Somente versões aprovadas podem ser liberadas ao cliente.
            </small>
            {!budgets.length ? (
              <small className="validation blocking">Nenhum orçamento calculado foi encontrado. Use valor fixo ou conclua o cálculo de um orçamento.</small>
            ) : null}
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
                ref={campo("fixedValue")}
                name="fixedValue"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={fixedValue || ""}
                onChange={(event) => setFixedValue(Number(event.target.value))}
                placeholder="150.000,00"
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
              ref={campo("discountPercent")}
              name="discountPercent"
              type="number"
              inputMode="decimal"
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
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploadInProgress || pending}
            onChange={(event) => void uploadPdf(event.target.files?.[0])}
          />
          <input type="hidden" name="uploadedPath" value={uploadedPath} />
          <small
            className={uploadState.status === "error" ? "field-error" : uploadState.status === "ready" ? "upload-success" : "field-help"}
            role={uploadState.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {uploadState.message}
          </small>
        </label>
      </div>

      <label className="checkline">
        <input
          name="releaseClient"
          type="checkbox"
          disabled={needsApproval || !pdfReady || (pricingMode === "BUDGET" && !selectedBudget?.approved)}
        />
        Liberar esta versão ao portal do cliente assim que for criada
      </label>

      <div className="proposal-form-footer">
        <span className="muted">Até 7%: alçada automática. Acima de 7%: diretoria.</span>
        <button className="button button-primary" type="submit" disabled={pending || uploadInProgress}>
          {pending ? "Criando proposta…" : uploadInProgress ? "Aguardando PDF…" : "Criar proposta"}
        </button>
      </div>
    </form>
  );
}
