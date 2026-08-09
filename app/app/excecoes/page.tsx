import { randomUUID } from "node:crypto";
import Link from "next/link";
import { registrarExcecaoOperacional } from "@/app/actions/operations";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { MODULE_BY_KEY } from "@/lib/modules/registry";
import { PERSONAS_OPERACIONAIS, type PersonaId } from "@/lib/personas/runtime";

export const dynamic = "force-dynamic";

function dataFutura(): string {
  const date = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export default async function OperationalExceptionsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const context = await requireOrganizationContext();
  const params = await searchParams;

  const [responsibilitiesResult, projectsResult] = await Promise.all([
    context.supabase
      .from("operational_responsibilities")
      .select("id,persona_id,project_id")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .eq("active", true),
    context.supabase
      .from("projects")
      .select("id,name,status")
      .eq("organization_id", context.organizationId)
      .order("name")
  ]);

  const firstError = responsibilitiesResult.error ?? projectsResult.error;
  if (firstError) {
    reportDataAccessError("operational-exceptions.load", firstError);
    throw new Error(DATA_LOAD_ERROR_MESSAGE);
  }

  const responsibilities = responsibilitiesResult.data ?? [];
  const personaIds = new Set(responsibilities.map(item => item.persona_id as PersonaId));
  const personas = PERSONAS_OPERACIONAIS.filter(item => personaIds.has(item.id));
  const personaById = new Map(PERSONAS_OPERACIONAIS.map(item => [item.id, item]));

  const moduleKeys = [...new Set(personas.flatMap(item => [...item.modules]))]
    .map(key => MODULE_BY_KEY.get(key))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const recipientIds = [...new Set(personas.flatMap(item => [...item.scenarios.pessimistic.notify]))];
  const recipients = recipientIds
    .map(id => personaById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const organizationScope = responsibilities.some(item => item.project_id === null);
  const scopedProjectIds = new Set(
    responsibilities.map(item => item.project_id).filter((id): id is string => Boolean(id))
  );
  const projects = organizationScope
    ? (projectsResult.data ?? [])
    : (projectsResult.data ?? []).filter(item => scopedProjectIds.has(item.id));

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Exceções operacionais"
        meta={<span className="pipeline-contagem">{personas.length} cadeira(s) ativa(s)</span>}
        controls={<Link className="button button-secondary" href="/app">Voltar aos aplicativos</Link>}
      />

      <p className="workspace-intro">
        Registre somente uma exceção real que exija decisão ou remoção de impedimento. O evento segue a matriz da sua
        cadeira profissional, cria destinatários nominais e passa a aparecer em Atividades para quem precisa agir.
      </p>

      {params.ok ? (
        <div className="validation success" role="status">Exceção registrada e distribuída conforme a matriz operacional.</div>
      ) : null}
      {params.error ? <div className="validation blocking" role="alert">{params.error}</div> : null}

      {!personas.length ? (
        <section className="card card-pad">
          <div className="empty-state">
            <h2>Nenhuma cadeira operacional atribuída</h2>
            <p>
              Você continua usando os aplicativos normalmente, mas não pode originar exceções até que um administrador
              associe uma responsabilidade operacional ao seu usuário.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="card card-pad">
            <div className="section-heading">
              <div>
                <span className="eyebrow">NOVA EXCEÇÃO</span>
                <h2>Informar ocorrência</h2>
              </div>
            </div>

            <form action={registrarExcecaoOperacional} className="responsibility-form">
              <input type="hidden" name="deduplicationKey" value={randomUUID()} />

              <label>
                Tipo de exceção
                <select name="eventCode" required>
                  {personas.map(persona => (
                    <option key={persona.id} value={persona.scenarios.pessimistic.event}>
                      {persona.role} · {persona.scenarios.pessimistic.event}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Aplicativo afetado
                <select name="moduleKey" required>
                  {moduleKeys.map(module => (
                    <option key={module.key} value={module.key}>{module.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Obra
                <select name="projectId" defaultValue="">
                  {organizationScope ? <option value="">Toda a organização</option> : null}
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name} · {project.status}</option>
                  ))}
                </select>
              </label>

              <label>
                Responsável pela resposta
                <select name="obligationPersona" required>
                  {recipients.map(persona => (
                    <option key={persona.id} value={persona.id}>{persona.id} · {persona.role}</option>
                  ))}
                </select>
              </label>

              <label>
                Responder até
                <input name="responseDueOn" type="date" min={dataFutura()} defaultValue={dataFutura()} required />
              </label>

              <label className="responsibility-form-wide">
                Título
                <input name="title" maxLength={160} placeholder="Ex.: material crítico indisponível para a frente" required />
              </label>

              <label className="responsibility-form-wide">
                Impacto
                <textarea
                  name="impact"
                  maxLength={1200}
                  rows={4}
                  placeholder="Explique o que parou, qual decisão é necessária e o que acontece se nada for feito."
                  required
                />
              </label>

              <label className="responsibility-form-wide">
                Evidência complementar
                <textarea
                  name="evidence"
                  maxLength={3000}
                  rows={3}
                  placeholder="Referência, medição, lote, revisão, condição observada ou outra evidência objetiva."
                />
              </label>

              <label className="responsibility-form-wide" style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
                <input name="clientApproved" type="checkbox" style={{ width: "auto" }} />
                Permitir notificação ao cliente quando a matriz deste evento incluir a cadeira Cliente.
              </label>

              <button className="button button-primary" type="submit">Registrar exceção</button>
            </form>
          </section>

          <section className="card card-pad">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SEU ESCOPO</span>
                <h2>Cadeiras que podem originar eventos</h2>
              </div>
            </div>
            <div className="observability-table-wrap">
              <table className="data-table">
                <thead><tr><th>Cadeira</th><th>Cenário crítico</th><th>Escopo</th><th>Destinatários padrão</th></tr></thead>
                <tbody>
                  {personas.map(persona => {
                    const scopes = responsibilities.filter(item => item.persona_id === persona.id);
                    return (
                      <tr key={persona.id}>
                        <td><strong>{persona.role}</strong><small>{persona.profession}</small></td>
                        <td>{persona.scenarios.pessimistic.description}</td>
                        <td>{scopes.some(item => item.project_id === null) ? "Toda a organização" : `${scopes.length} obra(s)`}</td>
                        <td>{persona.scenarios.pessimistic.notify.map(id => personaById.get(id)?.role ?? id).join(", ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
