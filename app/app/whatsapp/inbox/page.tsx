import Link from "next/link";
import {
  addMessagingConversationNote,
  assignMessagingConversation,
  assumeMessagingConversation,
  updateMessagingOperatorPresence
} from "@/app/actions/messaging-inbox";
import type { ChannelProviderType } from "@/lib/messaging/domain";
import {
  channelStateLabel,
  deriveInboxActionAvailability,
  messagingProviderLabel,
  type InboxChannelState
} from "@/lib/messaging/inbox";
import { loadMultiproviderInbox } from "@/lib/messaging/inbox.server";
import { PresenceHeartbeat } from "./presence-heartbeat";

const FILTERABLE_PROVIDERS = new Set<ChannelProviderType>([
  "META_CLOUD",
  "WHATSAPP_WEB_BAILEYS",
  "WEB_CHAT"
]);
const FILTERABLE_STATES = new Set<InboxChannelState>([
  "ONLINE",
  "OFFLINE",
  "RECONNECTING",
  "DEGRADED",
  "ACTION_REQUIRED"
]);
const RETURN_KEYS = ["provider", "account", "queue", "assignee", "project", "state", "unread", "q"] as const;

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function providerFilter(input: string): ChannelProviderType | null {
  return FILTERABLE_PROVIDERS.has(input as ChannelProviderType)
    ? input as ChannelProviderType
    : null;
}

function channelStateFilter(input: string): InboxChannelState | null {
  return FILTERABLE_STATES.has(input as InboxChannelState)
    ? input as InboxChannelState
    : null;
}

function stateTone(state: InboxChannelState) {
  if (state === "ONLINE") return { background: "#dcfce7", color: "#166534" };
  if (state === "RECONNECTING") return { background: "#fef3c7", color: "#92400e" };
  if (state === "DEGRADED") return { background: "#ffedd5", color: "#9a3412" };
  if (state === "ACTION_REQUIRED") return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#e2e8f0", color: "#475569" };
}

function actorLabel(actor: string) {
  if (actor === "AI") return "IA";
  if (actor === "AUTOMATION") return "Automação";
  if (actor === "SYSTEM") return "Sistema";
  return "Humano";
}

export default async function MultiproviderInboxPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const conversationId = value(params.conversation) || null;
  const returnParams = new URLSearchParams();
  for (const key of RETURN_KEYS) {
    const current = value(params[key]);
    if (current) returnParams.set(key, current);
  }
  const returnQuery = returnParams.toString();
  const conversationHref = (id: string) => {
    const query = new URLSearchParams(returnParams);
    query.set("conversation", id);
    return `/app/whatsapp/inbox?${query.toString()}`;
  };

  const data = await loadMultiproviderInbox({
    conversationId,
    filters: {
      providerType: providerFilter(value(params.provider)),
      accountId: value(params.account) || null,
      queueId: value(params.queue) || null,
      assignedTo: value(params.assignee) || null,
      projectId: value(params.project) || null,
      channelState: channelStateFilter(value(params.state)),
      unreadOnly: value(params.unread) === "1",
      search: value(params.q) || null
    }
  });
  const selected = data.selectedThread;
  const actions = selected
    ? deriveInboxActionAvailability({
      thread: selected,
      canManage: data.canManage,
      operatorPresence: data.presence
    })
    : null;

  const inputStyle = {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 10px",
    minHeight: 38,
    background: "white"
  } as const;
  const cardStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "white",
    padding: 14
  } as const;

  return (
    <main style={{ padding: 24, display: "grid", gap: 18, maxWidth: 1600, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Atendimento omnichannel</p>
          <h1 style={{ margin: "4px 0" }}>Inbox multiprovider</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Contatos unificados, threads preservadas e ações condicionadas ao estado de cada canal.
          </p>
        </div>
        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <form action={updateMessagingOperatorPresence} style={{ display: "flex", gap: 8 }}>
              {conversationId ? <input type="hidden" name="conversationId" value={conversationId} /> : null}
              <input type="hidden" name="returnQuery" value={returnQuery} />
              <select name="presence" defaultValue={data.presence} style={inputStyle} aria-label="Presença do operador">
                <option value="ONLINE">Disponível</option>
                <option value="AWAY">Ausente</option>
                <option value="BUSY">Ocupado</option>
                <option value="OFFLINE">Offline</option>
              </select>
              <button type="submit" style={inputStyle}>Atualizar</button>
            </form>
            <Link
              href={selected ? `/app/whatsapp?conversation=${selected.conversationId}` : "/app/whatsapp"}
              style={{ ...inputStyle, textDecoration: "none", color: "#0f172a" }}
            >
              Conversa detalhada
            </Link>
          </div>
          <PresenceHeartbeat presence={data.presence} conversationId={conversationId} />
        </div>
      </header>

      {value(params.error) ? (
        <div role="alert" style={{ ...cardStyle, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {value(params.error)}
        </div>
      ) : null}
      {value(params.success) ? (
        <div role="status" style={{ ...cardStyle, borderColor: "#86efac", background: "#f0fdf4", color: "#166534" }}>
          {value(params.success)}
        </div>
      ) : null}

      <form method="get" style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <input name="q" defaultValue={value(params.q)} placeholder="Buscar contato, obra, fila ou responsável" style={inputStyle} />
        <select name="provider" defaultValue={value(params.provider)} style={inputStyle} aria-label="Filtrar provider">
          <option value="">Todos os providers</option>
          <option value="META_CLOUD">Meta Cloud</option>
          <option value="WHATSAPP_WEB_BAILEYS">WhatsApp Web</option>
          <option value="WEB_CHAT">Chat Web</option>
        </select>
        <select name="queue" defaultValue={value(params.queue)} style={inputStyle} aria-label="Filtrar fila">
          <option value="">Todas as filas</option>
          {data.queues.map(queue => <option key={queue.id} value={queue.id}>{queue.name}</option>)}
        </select>
        <select name="assignee" defaultValue={value(params.assignee)} style={inputStyle} aria-label="Filtrar responsável">
          <option value="">Todos os responsáveis</option>
          {data.assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
        </select>
        <select name="state" defaultValue={value(params.state)} style={inputStyle} aria-label="Filtrar estado do canal">
          <option value="">Todos os estados</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="RECONNECTING">Reconectando</option>
          <option value="DEGRADED">Degradado</option>
          <option value="ACTION_REQUIRED">Ação necessária</option>
        </select>
        <label style={{ ...inputStyle, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="unread" value="1" defaultChecked={value(params.unread) === "1"} />
          Somente não lidas
        </label>
        <button type="submit" style={{ ...inputStyle, background: "#0f172a", color: "white" }}>Filtrar</button>
        <Link href="/app/whatsapp/inbox" style={{ ...inputStyle, textAlign: "center", textDecoration: "none", color: "#334155" }}>
          Limpar filtros
        </Link>
      </form>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Contatos</h2>
            <span style={{ color: "#64748b", fontSize: 13 }}>{data.unified.length} resultado(s)</span>
          </div>
          {data.unified.map(conversation => (
            <article key={conversation.contactId} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{conversation.contactName}</strong>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                    {conversation.threads.length} thread(s) · {conversation.unreadCount} não lida(s)
                  </div>
                </div>
                {conversation.conflictingOwnership ? (
                  <span style={{ color: "#b45309", fontSize: 12 }}>Ownership divergente</span>
                ) : null}
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {conversation.threads.map(thread => (
                  <Link
                    key={thread.conversationId}
                    href={conversationHref(thread.conversationId)}
                    style={{
                      border: thread.conversationId === conversationId ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: 9,
                      padding: 10,
                      color: "#0f172a",
                      textDecoration: "none",
                      display: "grid",
                      gap: 6
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span>{messagingProviderLabel(thread.providerType)}</span>
                      <span style={{ ...stateTone(thread.channelState), borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>
                        {channelStateLabel(thread.channelState)}
                      </span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      {thread.projectName ?? "Sem obra"} · {thread.queueName ?? "Sem fila"} · {thread.assignedName ?? "Sem responsável"}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      Último ator: {actorLabel(thread.lastActorKind)} · {thread.unreadCount} não lida(s)
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ))}
          {!data.unified.length ? <div style={cardStyle}>Nenhuma conversa corresponde aos filtros.</div> : null}
        </div>

        <aside style={{ display: "grid", gap: 12 }}>
          {selected ? (
            <>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <strong>{selected.contactName}</strong>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {selected.providerLabel} · {selected.providerAccountId || "Conta sem identificador"}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {selected.assignedName ?? "Sem responsável"} · {selected.queueName ?? "Sem fila"}
                    </div>
                  </div>
                  <span style={{ ...stateTone(selected.channelState), borderRadius: 999, padding: "4px 9px", fontSize: 12 }}>
                    {channelStateLabel(selected.channelState)}
                  </span>
                </div>
                {actions?.reason ? <p style={{ color: "#b45309", fontSize: 13 }}>{actions.reason}</p> : null}
                {!actions?.canSend ? (
                  <p style={{ color: "#64748b", fontSize: 13 }}>
                    O histórico pode ser consultado, mas o envio está indisponível neste estado ou provider.
                  </p>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <Link
                    href={`/app/whatsapp?conversation=${selected.conversationId}`}
                    style={{
                      ...inputStyle,
                      background: "#2563eb",
                      color: "white",
                      textDecoration: "none"
                    }}
                  >
                    Ver conversa
                  </Link>
                  {actions?.canAssign ? (
                    <form action={assumeMessagingConversation}>
                      <input type="hidden" name="conversationId" value={selected.conversationId} />
                      <input type="hidden" name="ownershipVersion" value={data.selectedOwnershipVersion} />
                      <input type="hidden" name="queueId" value={selected.queueId ?? ""} />
                      <input type="hidden" name="reason" value="Assumir atendimento pela inbox" />
                      <input type="hidden" name="returnQuery" value={returnQuery} />
                      <button type="submit" style={inputStyle}>Assumir</button>
                    </form>
                  ) : null}
                </div>
              </div>

              {actions?.canAssign ? (
                <form action={assignMessagingConversation} style={{ ...cardStyle, display: "grid", gap: 9 }}>
                  <strong>Fila e responsável</strong>
                  <input type="hidden" name="conversationId" value={selected.conversationId} />
                  <input type="hidden" name="ownershipVersion" value={data.selectedOwnershipVersion} />
                  <input type="hidden" name="returnQuery" value={returnQuery} />
                  <label style={{ display: "grid", gap: 4 }}>
                    Fila
                    <select name="queueId" defaultValue={selected.queueId ?? ""} style={inputStyle}>
                      <option value="">Sem fila</option>
                      {data.queues.map(queue => <option key={queue.id} value={queue.id}>{queue.name}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    Responsável
                    <select name="assigneeId" defaultValue={selected.assignedTo ?? ""} style={inputStyle}>
                      <option value="">Sem responsável</option>
                      {data.assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
                    </select>
                  </label>
                  <input name="reason" required minLength={3} maxLength={240} placeholder="Motivo da transferência" style={inputStyle} />
                  <button type="submit" style={{ ...inputStyle, background: "#0f172a", color: "white" }}>Salvar atribuição</button>
                </form>
              ) : null}

              <form action={addMessagingConversationNote} style={{ ...cardStyle, display: "grid", gap: 9 }}>
                <strong>Nota interna</strong>
                <input type="hidden" name="conversationId" value={selected.conversationId} />
                <input type="hidden" name="returnQuery" value={returnQuery} />
                <textarea name="body" required maxLength={4000} rows={4} placeholder="Visível somente para a equipe" style={inputStyle} disabled={!actions?.canAddNote} />
                <button type="submit" disabled={!actions?.canAddNote} style={inputStyle}>Registrar nota</button>
              </form>

              <div style={{ ...cardStyle, display: "grid", gap: 8 }}>
                <strong>Notas recentes</strong>
                {data.notes.map(note => (
                  <div key={note.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{note.body}</div>
                    <small style={{ color: "#64748b" }}>{new Date(note.createdAt).toLocaleString("pt-BR")}</small>
                  </div>
                ))}
                {!data.notes.length ? <span style={{ color: "#64748b" }}>Nenhuma nota interna.</span> : null}
              </div>
            </>
          ) : (
            <div style={cardStyle}>Selecione uma thread para gerenciar atendimento, notas e capabilities.</div>
          )}
        </aside>
      </section>
    </main>
  );
}
