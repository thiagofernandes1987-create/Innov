"use client";

import { useState, useTransition } from "react";
import { testMessagingBotDraft, type BotDraftTestState } from "@/app/actions/messaging-bots";

export function BotDraftTester({
  bots,
  conversations
}: {
  bots: Array<{ id: string; name: string; ready: boolean }>;
  conversations: Array<{ id: string; label: string; humanAssigned: boolean }>;
}) {
  const [result, setResult] = useState<BotDraftTestState | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      setResult(await testMessagingBotDraft(formData));
    });
  }

  return (
    <section className="card card-pad" style={{ display: "grid", gap: 14 }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">TESTE CONTROLADO</span>
          <h2>Gerar rascunho sem enviar</h2>
          <p>Executa lock, orçamento e auditoria. O resultado nunca é enviado ao cliente.</p>
        </div>
      </div>
      <form action={submit} className="field-form">
        <div className="field-grid">
          <label>
            Bot
            <select name="botId" required defaultValue="">
              <option value="" disabled>Selecione</option>
              {bots.map(bot => (
                <option key={bot.id} value={bot.id} disabled={!bot.ready}>
                  {bot.name}{bot.ready ? "" : " · bloqueado"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Conversa de teste
            <select name="conversationId" required defaultValue="">
              <option value="" disabled>Selecione</option>
              {conversations.map(conversation => (
                <option key={conversation.id} value={conversation.id} disabled={conversation.humanAssigned}>
                  {conversation.label}{conversation.humanAssigned ? " · controle humano" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Mensagem simulada do cliente
            <textarea
              name="sampleMessage"
              required
              minLength={2}
              maxLength={2000}
              rows={5}
              placeholder="Ex.: Qual é o andamento da minha obra?"
            />
          </label>
        </div>
        <button className="button button-primary" type="submit" disabled={pending || !bots.some(bot => bot.ready)}>
          {pending ? "Gerando rascunho..." : "Testar bot"}
        </button>
      </form>

      {result && !result.ok ? (
        <div className="validation blocking" role="alert">{result.error}</div>
      ) : null}
      {result?.ok ? (
        <div style={{ display: "grid", gap: 10 }} aria-live="polite">
          <div className="validation warning" role="status">
            {result.sourceWarning} Revisão humana obrigatória.
          </div>
          <label>
            Rascunho gerado
            <textarea readOnly rows={8} value={result.draft} style={{ width: "100%" }} />
          </label>
          <div className="card card-pad" style={{ display: "grid", gap: 4 }}>
            <small>Modelo: {result.model}</small>
            <small>Tokens: {result.inputTokens} entrada · {result.outputTokens} saída</small>
            <small>Custo estimado: {result.estimatedCostMicros} micros</small>
            {result.claimWarnings.length ? (
              <div role="alert">
                <strong>Alertas de claims</strong>
                {result.claimWarnings.map(warning => <div key={warning}><small>{warning}</small></div>)}
              </div>
            ) : <small>Nenhum número, data ou compromisso sem fonte foi detectado.</small>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
