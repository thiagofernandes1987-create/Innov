import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  createWhatsAppContentBinding,
  saveWhatsAppAccount,
  sendWhatsAppMessage,
  startWhatsAppConversation
} from "@/app/actions/whatsapp";
import { loadWhatsAppWorkspace } from "@/lib/whatsapp/server";

export const dynamic = "force-dynamic";

function relation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return relation(value[0]);
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function conversationName(item: Record<string, unknown>) {
  const contact = relation(item.whatsapp_contacts);
  const client = relation(item.clients);
  return String(
    client?.trade_name ??
      client?.legal_name ??
      contact?.display_name ??
      contact?.profile_name ??
      contact?.phone_e164 ??
      "Contato"
  );
}

function projectName(item: Record<string, unknown>) {
  const project = relation(item.projects);
  return project ? `${String(project.code ?? "")} ${String(project.name ?? "")}`.trim() : "Sem obra";
}

function dateTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo"
      }).format(date)
    : "—";
}

function sourceLabel(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const row = snapshot as Record<string, unknown>;
  return row.sourceName
    ? `${String(row.sourceName)} · ${String(row.sourceField ?? "")}`
    : null;
}

export default async function WhatsAppPage({
  searchParams
}: {
  searchParams: Promise<{
    conversation?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const query = await searchParams;
  const workspace = await loadWhatsAppWorkspace(query.conversation);
  const selected = workspace.conversations.find(
    item => item.id === workspace.selectedConversationId
  ) as Record<string, unknown> | undefined;
  const selectedCapabilities = workspace.selectedMessagingCapabilities;
  const availableAccounts = workspace.accounts.filter(
    account =>
      account.active &&
      workspace.accountCapabilities[account.id]?.canStartConversation
  );

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">APLICATIVO · ATENDIMENTO</span>
          <h1>WhatsApp e Atendimento</h1>
          <p>
            Conversas ligadas ao Cliente 360, CRM, obras, contratos e SAC. Mensagens padrão
            são resolvidas a partir dos modelos e documentos existentes; não existe cópia
            editável do texto neste módulo.
          </p>
        </div>
        <nav aria-label="Navegação do atendimento" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="button button-secondary" href="/app/whatsapp/inbox">
            Inbox multiprovider
          </Link>
          <Link className="button button-secondary" href="/app/whatsapp/bots">
            Bots e IA
          </Link>
        </nav>
      </section>

      {query.error ? (
        <div className="validation blocking" role="alert">{query.error}</div>
      ) : null}
      {query.success ? (
        <div className="validation" role="status">{query.success}</div>
      ) : null}
      {workspace.errors.length ? (
        <div className="validation warning" role="alert">
          Algumas fontes não puderam ser carregadas. Códigos: {workspace.errors.join(", ")}.
        </div>
      ) : null}
      {!workspace.providerPolicy.enabled ? (
        <div className="validation warning" role="status">
          O runtime Meta Cloud está desabilitado para esta organização. Ações de envio e
          abertura de conversa foram ocultadas pela política de capacidades.
        </div>
      ) : null}

      <section className="stats-grid">
        <article className="card card-pad">
          <span className="eyebrow">CONTAS ATIVAS</span>
          <strong>{workspace.accounts.filter(item => item.active).length}</strong>
          <p>Contas de canal cadastradas.</p>
        </article>
        <article className="card card-pad">
          <span className="eyebrow">CONVERSAS</span>
          <strong>{workspace.conversations.length}</strong>
          <p>Atendimentos abertos ou históricos.</p>
        </article>
        <article className="card card-pad">
          <span className="eyebrow">RUNTIME OFICIAL</span>
          <strong>{workspace.providerPolicy.enabled ? "ATIVO" : "DESATIVADO"}</strong>
          <p>Meta Cloud · envios condicionados às capabilities efetivas.</p>
        </article>
      </section>

      <section
        className="card card-pad"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))",
          gap: "1rem",
          alignItems: "start"
        }}
      >
        <aside>
          <div className="section-heading">
            <div>
              <span className="eyebrow">CAIXA DE ENTRADA</span>
              <h2>Conversas</h2>
            </div>
          </div>
          <div style={{ display: "grid", gap: ".5rem" }}>
            {workspace.conversations.map(item => {
              const row = item as Record<string, unknown>;
              const active = item.id === workspace.selectedConversationId;
              return (
                <Link
                  key={item.id}
                  href={`/app/whatsapp?conversation=${item.id}`}
                  className={active ? "card card-pad active" : "card card-pad"}
                >
                  <strong>{conversationName(row)}</strong>
                  <small>{projectName(row)}</small>
                  <small>
                    {String(item.status)} · {dateTime(item.last_message_at)}
                    {Number(item.unread_count) > 0 ? ` · ${item.unread_count} não lidas` : ""}
                  </small>
                </Link>
              );
            })}
            {!workspace.conversations.length ? (
              <div className="empty-state">
                <h3>Nenhuma conversa</h3>
                <p>Cadastre uma conta, abra um atendimento ou aguarde a primeira mensagem.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {selected ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ATENDIMENTO · {workspace.selectedProviderLabel.toUpperCase()}</span>
                  <h2>{conversationName(selected)}</h2>
                  <p>
                    {projectName(selected)} · última mensagem do cliente:{" "}
                    {dateTime(selected.last_customer_message_at)}
                  </p>
                </div>
              </div>

              <div
                className="card card-pad"
                style={{
                  minHeight: "320px",
                  maxHeight: "55vh",
                  overflowY: "auto",
                  display: "grid",
                  gap: ".75rem"
                }}
              >
                {workspace.messages.map(message => {
                  const outbound = message.direction === "OUTBOUND";
                  const provenance = sourceLabel(message.source_snapshot);
                  return (
                    <article
                      key={message.id}
                      className="card card-pad"
                      style={{
                        marginLeft: outbound ? "min(12%,48px)" : 0,
                        marginRight: outbound ? 0 : "min(12%,48px)",
                        overflowWrap: "anywhere"
                      }}
                    >
                      <small>
                        {outbound ? "Equipe" : "Cliente"} · {String(message.message_type)} ·{" "}
                        {String(message.status)} · {dateTime(message.occurred_at)}
                      </small>
                      {message.body ? <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p> : null}
                      {message.caption ? <p>{message.caption}</p> : null}
                      {provenance ? <small>Fonte canônica: {provenance}</small> : null}
                      {message.error_code ? (
                        <small role="alert">Falha: {String(message.error_code)}</small>
                      ) : null}
                    </article>
                  );
                })}
                {!workspace.messages.length ? (
                  <div className="empty-state">
                    <h3>Conversa sem mensagens</h3>
                    <p>Use uma ação suportada pelo provider desta conta.</p>
                  </div>
                ) : null}
              </div>

              {selectedCapabilities.canSendAny ? (
                <form action={sendWhatsAppMessage} className="card card-pad field-form">
                  <input type="hidden" name="conversationId" value={String(selected.id)} />
                  <input
                    type="hidden"
                    name="projectId"
                    value={String(selected.project_id ?? "")}
                  />
                  <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                  <div className="field-grid">
                    {selectedCapabilities.canSendTemplate ||
                    selectedCapabilities.canSendDocument ? (
                      <label className="span-2">
                        Mensagem padrão vinculada
                        <select name="bindingId" defaultValue="">
                          {selectedCapabilities.canSendText ? (
                            <option value="">Mensagem livre</option>
                          ) : (
                            <option value="" disabled>Selecione uma fonte</option>
                          )}
                          {workspace.bindings.map(binding => (
                            <option key={binding.id} value={binding.id}>
                              {binding.name}
                              {binding.meta_template_name
                                ? ` · template ${binding.meta_template_name}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {selectedCapabilities.canSendTemplate ||
                    selectedCapabilities.canSendDocument ? (
                      <label className="span-2">
                        Variáveis do modelo em JSON
                        <textarea
                          name="variables"
                          rows={3}
                          placeholder={'{"cliente_nome":"Marcos","obra_codigo":"OB-0026"}'}
                        />
                      </label>
                    ) : null}
                    {selectedCapabilities.canSendText ? (
                      <label className="span-2">
                        Mensagem livre
                        <textarea
                          name="body"
                          rows={5}
                          placeholder="Utilizada somente quando nenhuma mensagem padrão for selecionada."
                        />
                      </label>
                    ) : null}
                  </div>
                  <button className="button button-primary" type="submit">
                    Enviar pelo WhatsApp
                  </button>
                </form>
              ) : (
                <div className="validation warning" role="status">
                  Esta conta não possui capability outbound habilitada. O histórico permanece
                  disponível para consulta, mas as ações de envio foram ocultadas.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h2>Selecione ou inicie uma conversa</h2>
              <p>A central preserva o vínculo com cliente, obra, contrato e chamado.</p>
            </div>
          )}
        </div>
      </section>

      {availableAccounts.length ? (
        <section className="card card-pad">
          <div className="section-heading">
            <div>
              <span className="eyebrow">NOVO ATENDIMENTO</span>
              <h2>Abrir conversa</h2>
            </div>
          </div>
          <form action={startWhatsAppConversation} className="field-form">
            <div className="field-grid">
              <label>
                Conta
                <select name="accountId" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {availableAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.business_name || account.display_phone_number || account.phone_number_id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Telefone com país e DDD
                <input name="phone" required placeholder="5512999999999" />
              </label>
              <label>
                Nome exibido
                <input name="displayName" placeholder="Contato" />
              </label>
              <label>
                Cliente
                <select name="clientId" defaultValue="">
                  <option value="">Sem vínculo</option>
                  {workspace.clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.trade_name || client.legal_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Obra
                <select name="projectId" defaultValue="">
                  <option value="">Sem obra vinculada</option>
                  {workspace.projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.code} · {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button button-primary" type="submit">Abrir atendimento</button>
          </form>
        </section>
      ) : null}

      {workspace.canManage ? (
        <>
          <section className="card card-pad">
            <div className="section-heading">
              <div>
                <span className="eyebrow">GOVERNANÇA DE CONTEÚDO</span>
                <h2>Vincular mensagem padrão</h2>
              </div>
            </div>
            <p>
              O vínculo guarda apenas a referência. No envio, o sistema lê a versão atual
              selecionada, resolve as variáveis e registra hash, versão e campo utilizados.
            </p>
            <form action={createWhatsAppContentBinding} className="field-form">
              <div className="field-grid">
                <label>
                  Nome operacional
                  <input name="name" required placeholder="Envio de proposta aprovada" />
                </label>
                <label>
                  Fonte canônica
                  <select name="sourceToken" required defaultValue="">
                    <option value="" disabled>Selecione um modelo ou documento</option>
                    {workspace.sourceCatalog.map(source => (
                      <option key={source.token} value={source.token}>{source.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Template aprovado na Meta
                  <input name="metaTemplateName" placeholder="proposta_aprovada_v1" />
                </label>
                <label>
                  Idioma
                  <input name="languageCode" defaultValue="pt_BR" />
                </label>
                <label className="span-2">
                  Ordem dos parâmetros do template
                  <input name="parameterOrder" placeholder="cliente_nome, obra_codigo, validade" />
                </label>
                <label className="span-2">
                  Esquema de variáveis em JSON
                  <textarea
                    name="variablesSchema"
                    rows={3}
                    placeholder={'{"cliente_nome":"string","obra_codigo":"string"}'}
                  />
                </label>
              </div>
              <button className="button button-primary" type="submit">
                Criar vínculo canônico
              </button>
            </form>
          </section>

          <section className="card card-pad">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PROVEDOR OFICIAL</span>
                <h2>Conta do WhatsApp Business</h2>
              </div>
            </div>
            <p>
              Tokens e segredo do aplicativo permanecem exclusivamente no cofre do ambiente.
              Esta tela registra apenas os identificadores públicos necessários ao roteamento.
            </p>
            <form action={saveWhatsAppAccount} className="field-form">
              <div className="field-grid">
                <label>
                  WABA ID
                  <input name="wabaId" required inputMode="numeric" />
                </label>
                <label>
                  Phone Number ID
                  <input name="phoneNumberId" required inputMode="numeric" />
                </label>
                <label>
                  Número exibido
                  <input name="displayPhoneNumber" placeholder="+55 12 99999-9999" />
                </label>
                <label>
                  Nome empresarial
                  <input name="businessName" placeholder="Innovar Construções" />
                </label>
                <label>
                  <input type="checkbox" name="isDefault" /> Conta padrão
                </label>
              </div>
              <button className="button button-primary" type="submit">Salvar conta</button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}
