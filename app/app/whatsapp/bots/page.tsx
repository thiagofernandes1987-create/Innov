import Link from "next/link";
import {
  saveMessagingBotProfile,
  setMessagingAiBudget,
  setMessagingPluginPolicy
} from "@/app/actions/messaging-bots";
import { BOT_ALLOWED_TOOLS } from "@/lib/messaging/bots";
import { loadMessagingBotsWorkspace } from "@/lib/messaging/bots.server";
import { BotDraftTester } from "./bot-draft-tester";

const pluginLabels: Record<string, string> = {
  CONSENT: "Consentimento e opt-out",
  ANTI_SPAM: "Anti-spam",
  QUALIFICATION: "Qualificação comercial",
  PROJECT_STATUS: "Status da obra",
  DOCUMENT: "Documentos canônicos",
  SAC: "SAC e reclamações",
  HANDOFF: "Transferência para humano",
  AI_FALLBACK: "IA como último recurso"
};

function micros(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function MessagingBotsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const workspace = await loadMessagingBotsWorkspace();

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">ATENDIMENTO · BOTS E IA</span>
          <h1>Bots governados</h1>
          <p>
            Configure assistentes somente para criação de rascunhos. Todo conteúdo exige revisão
            humana e nenhum perfil possui permissão de envio automático.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="button button-secondary" href="/app/whatsapp/inbox">Inbox</Link>
          <Link className="button button-secondary" href="/app/whatsapp">Conversas</Link>
        </div>
      </section>

      {params.error ? <div className="validation blocking" role="alert">{params.error}</div> : null}
      {params.success ? <div className="validation" role="status">{params.success}</div> : null}

      <section className="stats-grid">
        <article className="card card-pad">
          <span className="eyebrow">PROVEDOR</span>
          <strong>{workspace.provider.configured ? "CONFIGURADO" : "BLOQUEADO"}</strong>
          <p>{workspace.provider.model ?? "Modelo não configurado"}</p>
        </article>
        <article className="card card-pad">
          <span className="eyebrow">ORÇAMENTO DIÁRIO</span>
          <strong>{micros(workspace.budget.maximumCostMicros)}</strong>
          <p>{micros(workspace.budget.committedCostMicros)} micros consumidos.</p>
        </article>
        <article className="card card-pad">
          <span className="eyebrow">AUTONOMIA</span>
          <strong>DRAFT_ONLY</strong>
          <p>Revisão humana obrigatória; envio autônomo bloqueado.</p>
        </article>
      </section>

      {!workspace.provider.configured ? (
        <div className="validation warning" role="alert">
          O provider de IA não está pronto. Variáveis ausentes: {workspace.provider.missingVariables.join(", ")}.
          Perfis podem ser preparados, mas testes reais permanecerão bloqueados.
        </div>
      ) : null}

      {workspace.canManage ? (
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <span className="eyebrow">NOVO PERFIL</span>
              <h2>Criar bot de rascunho</h2>
              <p>Segredos nunca devem ser colocados nas instruções. Credenciais pertencem ao ambiente.</p>
            </div>
          </div>
          <form action={saveMessagingBotProfile} className="field-form">
            <div className="field-grid">
              <label>
                Nome
                <input name="name" required minLength={3} maxLength={100} placeholder="Assistente comercial" />
              </label>
              <label>
                Provedor
                <select name="providerId" defaultValue="DISABLED">
                  <option value="DISABLED">Desabilitado</option>
                  <option value="OPENAI">OpenAI Responses API</option>
                </select>
              </label>
              <label>
                Modelo
                <input name="modelId" defaultValue={workspace.provider.model ?? ""} placeholder="Definido pelo ambiente" />
              </label>
              <label>
                Recuperação
                <select name="retrievalMode" defaultValue="LEXICAL">
                  <option value="LEXICAL">Lexical</option>
                  <option value="HYBRID">Híbrida</option>
                </select>
              </label>
              <label>
                Fila opcional
                <select name="queueId" defaultValue="">
                  <option value="">Todas as filas</option>
                  {workspace.queues.map(queue => <option key={queue.id} value={queue.id}>{queue.name}</option>)}
                </select>
              </label>
              <label>
                Obra opcional
                <select name="projectId" defaultValue="">
                  <option value="">Todas as obras permitidas</option>
                  {workspace.projects.map(project => <option key={project.id} value={project.id}>{project.label}</option>)}
                </select>
              </label>
              <label>
                Limite de saída
                <input name="maxOutputTokens" type="number" min={64} max={1200} defaultValue={500} required />
              </label>
              <label>
                Custo máximo por execução (micros)
                <input name="maxCostMicrosPerRun" type="number" min={0} max={1000000000} defaultValue={10000} required />
              </label>
              <label>
                Prioridade
                <input name="priority" type="number" min={1} max={10000} defaultValue={100} required />
              </label>
              <label style={{ alignSelf: "end" }}>
                <input type="checkbox" name="enabledForDrafts" /> Habilitar para testes de rascunho
              </label>
              <label className="span-2">
                Descrição
                <input name="description" maxLength={500} placeholder="Quando e por quem este bot deve ser utilizado" />
              </label>
              <label className="span-2">
                Instruções do sistema
                <textarea
                  name="systemInstructions"
                  required
                  minLength={20}
                  maxLength={4000}
                  rows={7}
                  defaultValue="Produza somente um rascunho objetivo em português do Brasil. Use apenas informações fornecidas ou fontes canônicas recuperadas. Não invente valores, datas, prazos, condições contratuais ou andamento de obra. Solicite revisão humana quando houver incerteza."
                />
              </label>
              <fieldset className="span-2" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                <legend>Ferramentas internas permitidas</legend>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {BOT_ALLOWED_TOOLS.map(tool => (
                    <label key={tool}><input type="checkbox" name="allowedTools" value={tool} /> {tool}</label>
                  ))}
                </div>
              </fieldset>
            </div>
            <button className="button button-primary" type="submit">Salvar perfil</button>
          </form>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 12 }}>
        <div className="section-heading">
          <div><span className="eyebrow">PERFIS</span><h2>Bots cadastrados</h2></div>
        </div>
        <div className="stats-grid">
          {workspace.profiles.map(profile => (
            <article className="card card-pad" key={profile.id} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{profile.name}</strong>
                <span className="badge">{profile.readiness.readyForDraftTest ? "PRONTO PARA TESTE" : "BLOQUEADO"}</span>
              </div>
              <small>{profile.providerId} · {profile.modelId ?? "sem modelo"} · prioridade {profile.priority}</small>
              <small>{profile.retrievalMode} · {profile.maxOutputTokens} tokens · {micros(profile.maxCostMicrosPerRun)} micros</small>
              <p>{profile.description ?? "Sem descrição operacional."}</p>
              <small>Ferramentas: {profile.allowedTools.join(", ") || "nenhuma"}</small>
              {profile.readiness.blockers.length ? (
                <div className="validation warning">
                  {profile.readiness.blockers.map(blocker => <div key={blocker}><small>{blocker}</small></div>)}
                </div>
              ) : null}
              <small>Envio permitido: não · revisão humana: obrigatória.</small>
            </article>
          ))}
          {!workspace.profiles.length ? (
            <div className="empty-state"><h3>Nenhum bot</h3><p>Crie o primeiro perfil governado para iniciar testes de rascunho.</p></div>
          ) : null}
        </div>
      </section>

      {workspace.canManage ? (
        <section className="card card-pad">
          <div className="section-heading"><div><span className="eyebrow">CUSTO</span><h2>Orçamento diário</h2></div></div>
          <form action={setMessagingAiBudget} className="field-form">
            <label>
              Máximo diário em micros
              <input name="maximumCostMicros" type="number" min={0} max={100000000000} defaultValue={workspace.budget.maximumCostMicros} required />
            </label>
            <button className="button button-primary" type="submit">Atualizar orçamento</button>
          </form>
        </section>
      ) : null}

      <BotDraftTester
        bots={workspace.profiles.map(profile => ({ id: profile.id, name: profile.name, ready: profile.readiness.readyForDraftTest }))}
        conversations={workspace.conversations}
      />

      <section className="card card-pad">
        <div className="section-heading"><div><span className="eyebrow">PIPELINE</span><h2>Plugins e automações</h2></div></div>
        <p>Consentimento e segurança executam antes de workflows; IA permanece obrigatoriamente por último.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {workspace.policies.map(policy => (
            <form action={setMessagingPluginPolicy} key={policy.pluginId} className="card card-pad" style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) 120px 140px auto", gap: 10, alignItems: "end" }}>
              <input type="hidden" name="pluginId" value={policy.pluginId} />
              <input type="hidden" name="requiredPermission" value={policy.requiredPermission ?? ""} />
              <input type="hidden" name="featureFlag" value={policy.featureFlag ?? ""} />
              <label>{pluginLabels[policy.pluginId] ?? policy.pluginId}<small style={{ display: "block" }}>{policy.pluginId}</small></label>
              <label>Prioridade<input name="priority" type="number" min={1} max={10000} defaultValue={policy.priority} /></label>
              <label><input name="enabled" type="checkbox" defaultChecked={policy.enabled} disabled={policy.pluginId === "CONSENT"} /> Habilitado</label>
              {policy.pluginId === "CONSENT" ? <input type="hidden" name="enabled" value="on" /> : null}
              <button className="button button-secondary" type="submit" disabled={!workspace.canManage}>Salvar</button>
            </form>
          ))}
          {!workspace.policies.length ? <div className="validation warning">Nenhuma política foi inicializada para a organização.</div> : null}
        </div>
      </section>

      <section className="two-column">
        <article className="card card-pad">
          <div className="section-heading"><div><span className="eyebrow">AUDITORIA</span><h2>Gerações recentes</h2></div></div>
          <div style={{ display: "grid", gap: 8 }}>
            {workspace.invocations.map(invocation => (
              <div className="card card-pad" key={String(invocation.id)}>
                <strong>{String(invocation.status)}</strong>
                <div><small>{String(invocation.provider_id)} · {String(invocation.model_id)}</small></div>
                <div><small>{String(invocation.input_tokens)} + {String(invocation.output_tokens)} tokens · {String(invocation.estimated_cost_micros)} micros</small></div>
                <div><small>{new Date(String(invocation.created_at)).toLocaleString("pt-BR")}</small></div>
              </div>
            ))}
            {!workspace.invocations.length ? <p>Nenhuma geração auditada.</p> : null}
          </div>
        </article>
        <article className="card card-pad">
          <div className="section-heading"><div><span className="eyebrow">HANDOFF</span><h2>Transferências para humanos</h2></div></div>
          <div style={{ display: "grid", gap: 8 }}>
            {workspace.handoffs.map(handoff => (
              <div className="card card-pad" key={String(handoff.id)}>
                <strong>{String(handoff.reason)} · {String(handoff.status)}</strong>
                <p>{String(handoff.summary)}</p>
                <small>{new Date(String(handoff.created_at)).toLocaleString("pt-BR")}</small>
              </div>
            ))}
            {!workspace.handoffs.length ? <p>Nenhum handoff registrado.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
