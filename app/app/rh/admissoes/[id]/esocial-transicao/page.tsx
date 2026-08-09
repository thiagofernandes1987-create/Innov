import Link from "next/link";
import { notFound } from "next/navigation";
import { generateS2200Transition, saveAdmissionEsocialTransitionProfile } from "@/app/actions/rh-admission-esocial-transition";
import { requireCapability } from "@/lib/authorization";
import { esocialConfigurationStatus } from "@/lib/rh/integrations/government";

export const dynamic = "force-dynamic";

export default async function AdmissionTransitionPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("rh", "read");
  const signing = esocialConfigurationStatus();

  const [{ data: admission, error }, { data: profile }, { data: events }] = await Promise.all([
    context.supabase
      .from("rh_admission_cases")
      .select("id,case_number,full_name,cpf,registration_number,admission_date,status")
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .maybeSingle(),
    context.supabase
      .from("rh_admission_esocial_profiles")
      .select("admission_type,admission_indicator,original_admission_date,admission_judicial_process_number,succession_registration_type,succession_registration_number,succession_previous_registration,succession_transfer_date,succession_observation,cpf_change_previous_cpf,cpf_change_previous_registration,cpf_change_date,cpf_change_observation")
      .eq("organization_id", context.organizationId)
      .eq("admission_case_id", id)
      .maybeSingle(),
    context.supabase
      .from("rh_esocial_events")
      .select("id,status,receipt_number,response_description,created_at")
      .eq("organization_id", context.organizationId)
      .eq("event_type", "S-2200")
      .eq("source_type", "ADMISSION_CASE")
      .eq("source_id", id)
      .order("created_at", { ascending: false })
  ]);

  if (error) throw new Error(error.message);
  if (!admission) notFound();
  const type = Number(profile?.admission_type ?? 1);
  const isTransition = [2, 3, 4, 6, 7].includes(type);

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">{admission.case_number}</span>
          <h1>Transição do vínculo no S-2200</h1>
          <p>{admission.full_name} · matrícula nova {admission.registration_number}. Use esta tela somente para transferência, sucessão, mudança de CPF ou admissão decorrente de ação fiscal/decisão judicial.</p>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary" href={`/app/rh/admissoes/${id}`}>Resumo</Link>
          <Link className="button button-secondary" href={`/app/rh/admissoes/${id}/esocial-especial`}>Aprendiz/temporário/imigrante</Link>
        </div>
      </section>

      {query.error ? <div className="validation blocking">{query.error}</div> : null}
      {query.success ? <div className="validation">Configuração de transição salva.</div> : null}
      {!profile ? <div className="validation blocking">Salve primeiro o perfil eSocial principal da admissão.</div> : null}

      <section className="card card-pad">
        <span className="eyebrow">REGRA</span>
        <h2>Fonte histórica preservada</h2>
        <p>Para transferência/sucessão, a data de admissão original permanece separada da data de transferência. Para mudança de CPF, a geração é bloqueada até existir S-2299 motivo 36 aceito para CPF/matrícula anteriores e data imediatamente precedente.</p>
      </section>

      <form action={saveAdmissionEsocialTransitionProfile} className="relationship-form">
        <input type="hidden" name="caseId" value={id} />
        <section className="card card-pad">
          <span className="eyebrow">TIPO DE INGRESSO</span>
          <div className="form-grid">
            <label><span>Tipo de admissão *</span><select name="admissionType" defaultValue={profile?.admission_type ?? 1} required>
              <option value="1">1 · Admissão normal</option>
              <option value="2">2 · Transferência no mesmo grupo econômico</option>
              <option value="3">3 · Transferência de empresa consorciada/consórcio</option>
              <option value="4">4 · Sucessão/incorporação/cisão/fusão</option>
              <option value="6">6 · Mudança de CPF</option>
              <option value="7">7 · Transferência de empresa sucedida inapta por inexistência de fato</option>
            </select></label>
            <label><span>Indicativo de admissão *</span><select name="admissionIndicator" defaultValue={profile?.admission_indicator ?? 1} required>
              <option value="1">1 · Normal</option><option value="2">2 · Decorrente de ação fiscal</option><option value="3">3 · Decorrente de decisão judicial</option>
            </select></label>
            <label><span>Data de admissão original</span><input type="date" name="originalAdmissionDate" defaultValue={profile?.original_admission_date ?? ""} /></label>
            <label className="span-2"><span>Processo trabalhista — somente decisão judicial</span><input name="admissionJudicialProcessNumber" inputMode="numeric" maxLength={20} defaultValue={profile?.admission_judicial_process_number ?? ""} placeholder="20 dígitos" /></label>
          </div>
        </section>

        <section className="card card-pad">
          <span className="eyebrow">TRANSFERÊNCIA / SUCESSÃO · tpAdmissao 2, 3, 4 ou 7</span>
          <div className="form-grid">
            <label><span>Tipo inscrição empregador anterior</span><select name="successionRegistrationType" defaultValue={profile?.succession_registration_type ?? ""}><option value="">Não informar</option><option value="1">CNPJ</option><option value="2">CPF</option><option value="5">CGC legado</option><option value="6">CEI legado</option></select></label>
            <label><span>Inscrição empregador anterior</span><input name="successionRegistrationNumber" inputMode="numeric" defaultValue={profile?.succession_registration_number ?? ""} /></label>
            <label><span>Matrícula anterior</span><input name="successionPreviousRegistration" defaultValue={profile?.succession_previous_registration ?? ""} /></label>
            <label><span>Data da transferência</span><input type="date" name="successionTransferDate" defaultValue={profile?.succession_transfer_date ?? ""} /></label>
            <label className="span-2"><span>Observação</span><input name="successionObservation" maxLength={255} defaultValue={profile?.succession_observation ?? ""} /></label>
          </div>
        </section>

        <section className="card card-pad">
          <span className="eyebrow">MUDANÇA DE CPF · tpAdmissao 6</span>
          <div className="form-grid">
            <label><span>CPF anterior</span><input name="cpfChangePreviousCpf" inputMode="numeric" maxLength={14} defaultValue={profile?.cpf_change_previous_cpf ?? ""} /></label>
            <label><span>Matrícula anterior</span><input name="cpfChangePreviousRegistration" defaultValue={profile?.cpf_change_previous_registration ?? ""} /></label>
            <label><span>Data da alteração do CPF</span><input type="date" name="cpfChangeDate" defaultValue={profile?.cpf_change_date ?? ""} /></label>
            <label className="span-2"><span>Observação</span><input name="cpfChangeObservation" maxLength={255} defaultValue={profile?.cpf_change_observation ?? ""} /></label>
          </div>
          <p className="validation">Novo CPF do caso: {admission.cpf ?? "ausente"}. O sistema exigirá a cadeia S-2299/36 aceita antes de gerar o novo S-2200.</p>
        </section>

        <div className="form-actions"><button className="button button-primary" type="submit" disabled={!profile}>Salvar transição</button></div>
      </form>

      <section className="card card-pad">
        <div className="section-heading"><div><span className="eyebrow">PRODUÇÃO RESTRITA</span><h2>Gerar + assinar S-2200 de transição</h2></div><span className="badge">{signing.signingConfigured ? "ASSINATURA CONFIGURADA" : "ASSINATURA BLOQUEADA"}</span></div>
        <form action={generateS2200Transition}>
          <input type="hidden" name="caseId" value={id} />
          <input type="hidden" name="environment" value="RESTRICTED" />
          <button className="button button-primary" type="submit" disabled={!profile || !isTransition || !signing.signingConfigured}>Gerar + assinar S-2200</button>
        </form>
        {!isTransition ? <p>Selecione e salve um tipo de transição (2, 3, 4, 6 ou 7) antes de gerar.</p> : null}
        <div className="finance-list">
          {(events ?? []).map((event) => <div className="finance-row" key={event.id}><div><Link className="text-link" href={`/app/rh/obrigacoes/esocial/eventos/${event.id}`}><strong>S-2200 · {event.status}</strong></Link><small>{event.receipt_number ?? event.response_description ?? "sem recibo"}</small></div></div>)}
        </div>
      </section>
    </main>
  );
}
