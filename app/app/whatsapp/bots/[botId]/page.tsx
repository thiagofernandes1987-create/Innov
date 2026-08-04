import Link from "next/link";
import { notFound } from "next/navigation";
import { saveMessagingBotProfile } from "@/app/actions/messaging-bots";
import { BOT_ALLOWED_TOOLS } from "@/lib/messaging/bots";
import { loadMessagingBotsWorkspace } from "@/lib/messaging/bots.server";

export default async function EditMessagingBotPage({
  params
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const workspace = await loadMessagingBotsWorkspace();
  if (!workspace.canManage) notFound();
  const profile = workspace.profiles.find(item => item.id === botId);
  if (!profile) notFound();

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">ATENDIMENTO · BOT GOVERNADO</span>
          <h1>Editar {profile.name}</h1>
          <p>
            Alterações preservam o mesmo perfil e seu histórico. Desmarcar a habilitação pausa
            novos testes sem excluir auditorias ou configurações.
          </p>
        </div>
        <Link className="button button-secondary" href="/app/whatsapp/bots">Voltar aos bots</Link>
      </section>

      <section className="card card-pad">
        <form action={saveMessagingBotProfile} className="field-form">
          <input type="hidden" name="profileId" value={profile.id} />
          <div className="field-grid">
            <label>
              Nome
              <input name="name" required minLength={3} maxLength={100} defaultValue={profile.name} />
            </label>
            <label>
              Provedor
              <select name="providerId" defaultValue={profile.providerId}>
                <option value="DISABLED">Desabilitado</option>
                <option value="OPENAI">OpenAI Responses API</option>
              </select>
            </label>
            <label>
              Modelo
              <input name="modelId" defaultValue={profile.modelId ?? ""} />
            </label>
            <label>
              Recuperação
              <select name="retrievalMode" defaultValue={profile.retrievalMode}>
                <option value="LEXICAL">Lexical</option>
                <option value="HYBRID">Híbrida — bloqueada até índice autorizado</option>
              </select>
            </label>
            <label>
              Fila opcional
              <select name="queueId" defaultValue={profile.queueId ?? ""}>
                <option value="">Todas as filas</option>
                {workspace.queues.map(queue => <option key={queue.id} value={queue.id}>{queue.name}</option>)}
              </select>
            </label>
            <label>
              Obra opcional
              <select name="projectId" defaultValue={profile.projectId ?? ""}>
                <option value="">Todas as obras permitidas</option>
                {workspace.projects.map(project => <option key={project.id} value={project.id}>{project.label}</option>)}
              </select>
            </label>
            <label>
              Limite de saída
              <input name="maxOutputTokens" type="number" min={64} max={1200} defaultValue={profile.maxOutputTokens} required />
            </label>
            <label>
              Custo máximo por execução (micros)
              <input name="maxCostMicrosPerRun" type="number" min={0} max={1000000000} defaultValue={profile.maxCostMicrosPerRun} required />
            </label>
            <label>
              Prioridade do perfil
              <input name="priority" type="number" min={1} max={10000} defaultValue={profile.priority} required />
            </label>
            <label style={{ alignSelf: "end" }}>
              <input type="checkbox" name="enabledForDrafts" defaultChecked={profile.enabledForDrafts} />
              Habilitado para testes de rascunho
            </label>
            <label className="span-2">
              Descrição
              <input name="description" maxLength={500} defaultValue={profile.description ?? ""} />
            </label>
            <label className="span-2">
              Instruções do sistema
              <textarea
                name="systemInstructions"
                required
                minLength={20}
                maxLength={4000}
                rows={9}
                defaultValue={profile.systemInstructions}
              />
            </label>
            <fieldset className="span-2" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <legend>Ferramentas internas permitidas</legend>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {BOT_ALLOWED_TOOLS.map(tool => (
                  <label key={tool}>
                    <input
                      type="checkbox"
                      name="allowedTools"
                      value={tool}
                      defaultChecked={profile.allowedTools.includes(tool)}
                    /> {tool}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="button button-primary" type="submit">Salvar alterações</button>
            <Link className="button button-secondary" href="/app/whatsapp/bots">Cancelar</Link>
          </div>
        </form>
      </section>

      <div className="validation warning" role="status">
        Autonomia permanece DRAFT_ONLY, revisão humana continua obrigatória e o envio automático
        não pode ser habilitado por esta tela.
      </div>
    </main>
  );
}
