import Link from "next/link";
import { notFound } from "next/navigation";
import { generateTsvSpecialS2300, saveTsvSpecialEsocialProfile } from "@/app/actions/rh-tsv-special-esocial";
import { requireCapability } from "@/lib/authorization";
import { esocialConfigurationStatus } from "@/lib/rh/integrations/government";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function TsvSpecialPage({
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

  const [{ data: employment, error }, { data: profile }, { data: accepted }, { data: latest }] = await Promise.all([
    context.supabase
      .from("rh_employments")
      .select("id,registration_number,admission_date,employment_type,rh_workers(worker_code,rh_people(full_name,preferred_name,cpf)),rh_employment_conditions(valid_from,position_id,rh_positions(name,cbo_code))")
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .maybeSingle(),
    context.supabase.from("rh_tsv_esocial_profiles").select("*").eq("organization_id", context.organizationId).eq("employment_id", id).maybeSingle(),
    context.supabase.from("rh_esocial_events").select("id,receipt_number").eq("organization_id", context.organizationId).eq("event_type", "S-2300").eq("source_type", "TSV_EMPLOYMENT").eq("source_id", id).eq("status", "ACCEPTED").limit(1).maybeSingle(),
    context.supabase.from("rh_esocial_events").select("id,status,receipt_number,response_description,created_at").eq("organization_id", context.organizationId).eq("event_type", "S-2300").eq("source_type", "TSV_EMPLOYMENT").eq("source_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  if (error) throw new Error(error.message);
  if (!employment) notFound();

  const worker = one(employment.rh_workers);
  const person = worker ? one(worker.rh_people) : null;
  const conditions = Array.isArray(employment.rh_employment_conditions) ? [...employment.rh_employment_conditions] : [];
  const condition = conditions.sort((a, b) => String(b.valid_from ?? "").localeCompare(String(a.valid_from ?? "")))[0] ?? null;
  const position = condition ? one(condition.rh_positions) : null;
  const category = String(profile?.category_code ?? "401");

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">TSVE ESPECIAL · {employment.registration_number}</span>
          <h1>{person?.preferred_name || person?.full_name || worker?.worker_code}</h1>
          <p>Dirigente sindical 401, trabalhador cedido 305/410 e mandato eletivo 304. Os dados de origem são preservados separadamente do vínculo atual.</p>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary" href={`/app/rh/tsv/${id}`}>Perfil geral</Link>
          <Link className="button button-secondary" href="/app/rh/tsv">Lista TSVE</Link>
        </div>
      </section>

      {query.error ? <div className="validation blocking">{query.error}</div> : null}
      {query.success ? <div className="validation">Perfil especial salvo.</div> : null}
      {accepted ? <div className="validation blocking">Este TSVE já possui S-2300 aceito{accepted.receipt_number ? ` (${accepted.receipt_number})` : ""}. O início não pode ser refeito por esta tela.</div> : null}

      <section className="stats-grid">
        <article className="card"><small>CPF</small><strong>{person?.cpf ?? "—"}</strong></article>
        <article className="card"><small>CATEGORIA</small><strong>{category}</strong></article>
        <article className="card"><small>CARGO/FUNÇÃO</small><strong>{position?.name ?? profile?.special_function_name ?? "—"}</strong></article>
        <article className="card"><small>S-2300</small><strong>{latest?.status ?? "NÃO GERADO"}</strong></article>
      </section>

      <form action={saveTsvSpecialEsocialProfile} className="relationship-form">
        <input type="hidden" name="employmentId" value={id} />

        <section className="card card-pad">
          <span className="eyebrow">GRUPO ESPECIAL</span>
          <h2>Categoria e estrutura de trabalho</h2>
          <div className="form-grid">
            <label><span>Categoria *</span><select name="categoryCode" defaultValue={category} required><option value="401">401 · Dirigente sindical</option><option value="305">305 · Servidor cedido</option><option value="410">410 · Trabalhador cedido/servidor em conselho</option><option value="304">304 · Mandato eletivo</option></select></label>
            <label><span>Natureza atividade — 401</span><select name="specialActivityNature" defaultValue={profile?.special_activity_nature ?? ""}><option value="">Não informar</option><option value="1">Urbana</option><option value="2">Rural</option></select></label>
            <label><span>Função — alternativa ao cargo na 410</span><input name="specialFunctionName" defaultValue={profile?.special_function_name ?? ""} /></label>
            <label><span>CBO função</span><input name="specialFunctionCboCode" inputMode="numeric" maxLength={6} defaultValue={profile?.special_function_cbo_code ?? ""} /></label>
          </div>
          <p className="validation">Cargo atual: {position ? `${position.name} · ${position.cbo_code ?? "CBO ausente"}` : "não informado"}. A categoria 410 admite função como alternativa ao cargo.</p>
        </section>

        <section className="card card-pad">
          <span className="eyebrow">401 · DIRIGENTE SINDICAL</span>
          <div className="form-grid">
            <label><span>Categoria de origem</span><input name="unionOriginCategory" inputMode="numeric" maxLength={3} defaultValue={profile?.union_origin_category ?? ""} /></label>
            <label><span>Tipo inscrição origem</span><select name="unionOriginRegistrationType" defaultValue={profile?.union_origin_registration_type ?? ""}><option value="">Não informar</option><option value="1">CNPJ</option><option value="2">CPF</option></select></label>
            <label><span>Inscrição origem</span><input name="unionOriginRegistrationNumber" inputMode="numeric" defaultValue={profile?.union_origin_registration_number ?? ""} /></label>
            <label><span>Admissão origem</span><input type="date" name="unionOriginAdmissionDate" defaultValue={profile?.union_origin_admission_date ?? ""} /></label>
            <label><span>Matrícula origem</span><input name="unionOriginRegistration" defaultValue={profile?.union_origin_registration ?? ""} /></label>
            <label><span>Regime trabalhista origem</span><select name="unionOriginWorkRegime" defaultValue={profile?.union_origin_work_regime ?? ""}><option value="">Não informar</option><option value="1">CLT</option><option value="2">Estatutário</option></select></label>
            <label><span>Regime previdenciário origem</span><select name="unionOriginSocialSecurityRegime" defaultValue={profile?.union_origin_social_security_regime ?? ""}><option value="">Não informar</option><option value="1">RGPS</option><option value="2">RPPS</option><option value="3">Exterior</option></select></label>
          </div>
        </section>

        <section className="card card-pad">
          <span className="eyebrow">305/410 · TRABALHADOR CEDIDO</span>
          <div className="form-grid">
            <label><span>Categoria de origem</span><input name="cededOriginCategory" inputMode="numeric" maxLength={3} defaultValue={profile?.ceded_origin_category ?? ""} /></label>
            <label><span>CNPJ do cedente</span><input name="cedentCnpj" inputMode="numeric" defaultValue={profile?.cedent_cnpj ?? ""} /></label>
            <label><span>Matrícula no cedente</span><input name="cedentRegistration" defaultValue={profile?.cedent_registration ?? ""} /></label>
            <label><span>Admissão no cedente</span><input type="date" name="cedentAdmissionDate" defaultValue={profile?.cedent_admission_date ?? ""} /></label>
            <label><span>Regime trabalhista</span><select name="cededWorkRegime" defaultValue={profile?.ceded_work_regime ?? ""}><option value="">Não informar</option><option value="1">CLT</option><option value="2">Estatutário</option></select></label>
            <label><span>Regime previdenciário</span><select name="cededSocialSecurityRegime" defaultValue={profile?.ceded_social_security_regime ?? ""}><option value="">Não informar</option><option value="1">RGPS</option><option value="2">RPPS</option><option value="3">Exterior</option><option value="4">SPSMFA</option></select></label>
          </div>
        </section>

        <section className="card card-pad">
          <span className="eyebrow">304 · MANDATO ELETIVO</span>
          <div className="form-grid">
            <label><span>Categoria de origem</span><input name="mandateOriginCategory" inputMode="numeric" maxLength={3} defaultValue={profile?.mandate_origin_category ?? ""} /></label>
            <label><span>CNPJ origem</span><input name="mandateOriginCnpj" inputMode="numeric" defaultValue={profile?.mandate_origin_cnpj ?? ""} /></label>
            <label><span>Matrícula origem</span><input name="mandateOriginRegistration" defaultValue={profile?.mandate_origin_registration ?? ""} /></label>
            <label><span>Data exercício original</span><input type="date" name="mandateOriginExerciseDate" defaultValue={profile?.mandate_origin_exercise_date ?? ""} /></label>
            <label><span>Mantém remuneração cargo origem</span><select name="mandateKeepOriginRemuneration" defaultValue={profile?.mandate_keep_origin_remuneration ?? ""}><option value="">Não informar</option><option value="S">Sim</option><option value="N">Não</option></select></label>
            <label><span>Regime trabalhista</span><select name="mandateWorkRegime" defaultValue={profile?.mandate_work_regime ?? ""}><option value="">Não informar</option><option value="1">CLT</option><option value="2">Estatutário</option></select></label>
            <label><span>Regime previdenciário</span><select name="mandateSocialSecurityRegime" defaultValue={profile?.mandate_social_security_regime ?? ""}><option value="">Não informar</option><option value="1">RGPS</option><option value="2">RPPS</option><option value="3">Exterior</option></select></label>
          </div>
        </section>

        <div className="form-actions"><button className="button button-primary" type="submit" disabled={!profile || Boolean(accepted)}>Salvar perfil especial</button></div>
      </form>

      <section className="card card-pad">
        <div className="section-heading"><div><span className="eyebrow">PRODUÇÃO RESTRITA</span><h2>Gerar + assinar S-2300 especial</h2></div><span className="badge">{signing.signingConfigured ? "ASSINATURA CONFIGURADA" : "ASSINATURA BLOQUEADA"}</span></div>
        <form action={generateTsvSpecialS2300}>
          <input type="hidden" name="employmentId" value={id} />
          <input type="hidden" name="environment" value="RESTRICTED" />
          <button className="button button-primary" type="submit" disabled={!profile || Boolean(accepted) || !signing.signingConfigured}>Gerar + assinar S-2300</button>
        </form>
        {latest ? <p>Último evento: <Link className="text-link" href={`/app/rh/obrigacoes/esocial/eventos/${latest.id}`}>{latest.status}{latest.receipt_number ? ` · recibo ${latest.receipt_number}` : latest.response_description ? ` · ${latest.response_description}` : ""}</Link></p> : null}
      </section>
    </main>
  );
}
