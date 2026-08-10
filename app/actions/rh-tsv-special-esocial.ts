"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { signEsocialXml } from "@/lib/rh/integrations/esocial-signature";
import { buildS2300Special, type S2300SpecialCategory } from "@/lib/rh/integrations/esocial-tsv-special-xml";
import { xmlSha256, type EsocialEnvironment } from "@/lib/rh/integrations/esocial-xml";

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function num(data: FormData, key: string) { const value = text(data, key); return value ? Number(value) : null; }
function digits(value: string) { return value.replace(/\D/g, ""); }
function env(value: string): EsocialEnvironment { return value === "PRODUCTION" ? "PRODUCTION" : "RESTRICTED"; }
function employerType(value: string): 1 | 2 { return digits(value).length === 11 ? 2 : 1; }
function estType(value: string): 1 | 3 | 4 { return value === "CAEPF" ? 3 : value === "CNO" ? 4 : 1; }
function route(id: string) { return `/app/rh/tsv/${id}/especial`; }
function fail(id: string, message: string): never { redirect(`${route(id)}?error=${encodeURIComponent(message)}`); }
function transmitter(type: 1 | 2, number: string) {
  const raw = Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE ?? type);
  return { type: (raw === 2 ? 2 : 1) as 1 | 2, number: digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER ?? number) };
}
function specialCategory(value: string): value is S2300SpecialCategory { return ["304","305","401","410"].includes(value); }

async function ensureNotAccepted(context: Awaited<ReturnType<typeof requireCapability>>, employmentId: string) {
  const { data, error } = await context.supabase.from("rh_esocial_events").select("id").eq("organization_id", context.organizationId).eq("event_type", "S-2300").eq("source_type", "TSV_EMPLOYMENT").eq("source_id", employmentId).eq("status", "ACCEPTED").limit(1).maybeSingle();
  if (error) throw new Error(mensagemDeFalha("rh-tsv-special-esocial.ensureNotAccepted", error));
  if (data) throw new Error("O TSVE já possui S-2300 aceito. Alterações posteriores devem usar o evento apropriado, não um novo início.");
}

export async function saveTsvSpecialEsocialProfile(data: FormData) {
  const employmentId = text(data, "employmentId");
  const categoryCode = text(data, "categoryCode");
  const context = await requireCapability("rh", "update");
  if (!specialCategory(categoryCode)) fail(employmentId, "Selecione 304, 305, 401 ou 410.");
  try { await ensureNotAccepted(context, employmentId); } catch (error) { fail(employmentId, error instanceof Error ? mensagemDeFalha("rh-tsv-special-esocial.saveTsvSpecialEsocialProfile", error) : "Falha ao validar RET."); }

  const commonClear = {
    fgts_option_date: null,
    internship_nature: null,
    internship_level: null,
    internship_area: null,
    internship_policy_number: null,
    internship_expected_end: null,
    education_institution_cnpj: null,
    education_institution_name: null,
    education_institution_street: null,
    education_institution_number: null,
    education_institution_neighborhood: null,
    education_institution_postal_code: null,
    education_institution_city_ibge_code: null,
    education_institution_state_code: null,
    integration_agent_cnpj: null,
    internship_supervisor_cpf: null
  };

  const payload = {
    ...commonClear,
    category_code: categoryCode,
    special_activity_nature: categoryCode === "401" ? num(data, "specialActivityNature") : null,
    special_function_name: categoryCode === "410" ? text(data, "specialFunctionName") || null : null,
    special_function_cbo_code: categoryCode === "410" ? digits(text(data, "specialFunctionCboCode")) || null : null,
    union_origin_category: categoryCode === "401" ? text(data, "unionOriginCategory") || null : null,
    union_origin_registration_type: categoryCode === "401" ? num(data, "unionOriginRegistrationType") : null,
    union_origin_registration_number: categoryCode === "401" ? digits(text(data, "unionOriginRegistrationNumber")) || null : null,
    union_origin_admission_date: categoryCode === "401" ? text(data, "unionOriginAdmissionDate") || null : null,
    union_origin_registration: categoryCode === "401" ? text(data, "unionOriginRegistration") || null : null,
    union_origin_work_regime: categoryCode === "401" ? num(data, "unionOriginWorkRegime") : null,
    union_origin_social_security_regime: categoryCode === "401" ? num(data, "unionOriginSocialSecurityRegime") : null,
    ceded_origin_category: ["305","410"].includes(categoryCode) ? text(data, "cededOriginCategory") || null : null,
    cedent_cnpj: ["305","410"].includes(categoryCode) ? digits(text(data, "cedentCnpj")) || null : null,
    cedent_registration: ["305","410"].includes(categoryCode) ? text(data, "cedentRegistration") || null : null,
    cedent_admission_date: ["305","410"].includes(categoryCode) ? text(data, "cedentAdmissionDate") || null : null,
    ceded_work_regime: ["305","410"].includes(categoryCode) ? num(data, "cededWorkRegime") : null,
    ceded_social_security_regime: ["305","410"].includes(categoryCode) ? num(data, "cededSocialSecurityRegime") : null,
    mandate_origin_category: categoryCode === "304" ? text(data, "mandateOriginCategory") || null : null,
    mandate_origin_cnpj: categoryCode === "304" ? digits(text(data, "mandateOriginCnpj")) || null : null,
    mandate_origin_registration: categoryCode === "304" ? text(data, "mandateOriginRegistration") || null : null,
    mandate_origin_exercise_date: categoryCode === "304" ? text(data, "mandateOriginExerciseDate") || null : null,
    mandate_keep_origin_remuneration: categoryCode === "304" ? text(data, "mandateKeepOriginRemuneration") || null : null,
    mandate_work_regime: categoryCode === "304" ? num(data, "mandateWorkRegime") : null,
    mandate_social_security_regime: categoryCode === "304" ? num(data, "mandateSocialSecurityRegime") : null,
    updated_at: new Date().toISOString()
  };

  const { data: profile, error: findError } = await context.supabase.from("rh_tsv_esocial_profiles").select("id").eq("organization_id", context.organizationId).eq("employment_id", employmentId).maybeSingle();
  if (findError) fail(employmentId, mensagemDeFalha("rh-tsv-special-esocial.saveTsvSpecialEsocialProfile", findError));
  if (!profile) fail(employmentId, "Salve primeiro o perfil básico do TSVE.");
  const { error } = await context.supabase.from("rh_tsv_esocial_profiles").update(payload).eq("organization_id", context.organizationId).eq("employment_id", employmentId);
  if (error) fail(employmentId, mensagemDeFalha("rh-tsv-special-esocial.saveTsvSpecialEsocialProfile", error));
  revalidatePath(route(employmentId));
  revalidatePath(`/app/rh/tsv/${employmentId}`);
  redirect(`${route(employmentId)}?success=1`);
}

export async function generateTsvSpecialS2300(data: FormData) {
  const employmentId = text(data, "employmentId");
  const environment = env(text(data, "environment"));
  const context = await requireCapability("rh", "update");
  if (environment === "PRODUCTION" && process.env.ESOCIAL_ENABLE_PRODUCTION !== "true") fail(employmentId, "Produção bloqueada até homologação formal.");
  let eventId = "";
  try {
    await ensureNotAccepted(context, employmentId);
    const { data: employment, error: employmentError } = await context.supabase.from("rh_employments").select("id,worker_id,registration_number,employment_type,admission_date,base_salary").eq("organization_id", context.organizationId).eq("id", employmentId).maybeSingle();
    if (employmentError || !employment) throw new Error(mensagemDeFalha("rh-tsv-special-esocial.generateTsvSpecialS2300", employmentError, "TSVE não encontrado."));
    const [{ data: profile, error: profileError }, { data: worker }, { data: condition }] = await Promise.all([
      context.supabase.from("rh_tsv_esocial_profiles").select("*").eq("organization_id", context.organizationId).eq("employment_id", employmentId).maybeSingle(),
      context.supabase.from("rh_workers").select("person_id").eq("organization_id", context.organizationId).eq("id", employment.worker_id).maybeSingle(),
      context.supabase.from("rh_employment_conditions").select("employer_id,establishment_id,position_id,base_salary").eq("organization_id", context.organizationId).eq("employment_id", employmentId).lte("valid_from", employment.admission_date).or(`valid_to.is.null,valid_to.gt.${employment.admission_date}`).order("valid_from", { ascending: false }).limit(1).maybeSingle()
    ]);
    if (profileError) throw new Error(mensagemDeFalha("rh-tsv-special-esocial.generateTsvSpecialS2300", profileError));
    if (!profile || !worker || !condition) throw new Error("Perfil, trabalhador ou condição vigente ausente.");
    if (!specialCategory(profile.category_code)) throw new Error("Perfil não está em categoria especial 304/305/401/410.");

    const [{ data: person }, { data: employer }, { data: establishment }, { data: position }] = await Promise.all([
      context.supabase.from("rh_people").select("full_name,cpf,birth_date,email,phone").eq("organization_id", context.organizationId).eq("id", worker.person_id).single(),
      context.supabase.from("rh_employers").select("tax_id").eq("organization_id", context.organizationId).eq("id", condition.employer_id).single(),
      context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("organization_id", context.organizationId).eq("id", condition.establishment_id).single(),
      condition.position_id ? context.supabase.from("rh_positions").select("name,cbo_code").eq("organization_id", context.organizationId).eq("id", condition.position_id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);
    if (!person?.cpf || !person.birth_date || !employer || !establishment) throw new Error("CPF/nascimento/empregador/estabelecimento incompletos.");
    if (profile.category_code !== "410" && !position?.cbo_code) throw new Error(`Categoria ${profile.category_code} exige cargo/CBO na condição vigente.`);

    const immigrant = profile.nationality_country_code !== "105" ? { residenceTerm: Number(profile.immigrant_residence_term) as 1 | 2, entryCondition: Number(profile.immigrant_entry_condition) as 1 | 2 | 3 | 4 | 5 | 6 | 7 } : null;
    const salary = Number(condition.base_salary ?? employment.base_salary);
    const eType = employerType(employer.tax_id);
    const unsigned = buildS2300Special({
      environment, employerType: eType, employerNumber: employer.tax_id,
      cpf: person.cpf, fullName: person.full_name, sex: profile.sex, raceColor: profile.race_color, maritalStatus: profile.marital_status,
      educationLevel: profile.education_level, birthDate: person.birth_date, birthCountryCode: profile.birth_country_code, nationalityCountryCode: profile.nationality_country_code,
      address: { streetType: profile.street_type, street: profile.street, number: profile.street_number, complement: profile.complement, neighborhood: profile.neighborhood, postalCode: profile.postal_code, cityIbgeCode: profile.city_ibge_code, state: profile.state_code },
      phone: person.phone, email: person.email, immigrant,
      registrationNumber: employment.registration_number, categoryCode: profile.category_code, startDate: employment.admission_date,
      judicialProcessNumber: profile.judicial_process_number, activityNature: profile.special_activity_nature,
      position: { positionName: position?.name ?? null, positionCbo: position?.cbo_code ?? null, functionName: profile.special_function_name, functionCbo: profile.special_function_cbo_code },
      remuneration: Number.isFinite(salary) && salary >= 0 ? { amount: salary, unit: profile.salary_unit, variableDescription: profile.variable_salary_description } : null,
      establishmentType: estType(establishment.registration_type), establishmentNumber: establishment.registration_number,
      unionLeader: profile.category_code === "401" ? { originCategory: profile.union_origin_category, originRegistrationType: profile.union_origin_registration_type, originRegistrationNumber: profile.union_origin_registration_number, originAdmissionDate: profile.union_origin_admission_date, originRegistration: profile.union_origin_registration, workRegime: profile.union_origin_work_regime, socialSecurityRegime: profile.union_origin_social_security_regime } : null,
      cededWorker: ["305","410"].includes(profile.category_code) ? { originCategory: profile.ceded_origin_category, cedentCnpj: profile.cedent_cnpj, cedentRegistration: profile.cedent_registration, cedentAdmissionDate: profile.cedent_admission_date, workRegime: profile.ceded_work_regime, socialSecurityRegime: profile.ceded_social_security_regime } : null,
      electiveMandate: profile.category_code === "304" ? { originCategory: profile.mandate_origin_category, originCnpj: profile.mandate_origin_cnpj, originRegistration: profile.mandate_origin_registration, originExerciseDate: profile.mandate_origin_exercise_date, keepOriginRemuneration: profile.mandate_keep_origin_remuneration, workRegime: profile.mandate_work_regime, socialSecurityRegime: profile.mandate_social_security_regime } : null
    });
    const signed = signEsocialXml(unsigned);
    const tx = transmitter(eType, employer.tax_id);
    if (!tx.number) throw new Error("Transmissor eSocial não configurado.");
    const { data: id, error } = await context.supabase.rpc("persist_rh_esocial_generated_event", {
      p_organization_id: context.organizationId, p_event_type: "S-2300", p_event_key: signed.eventKey, p_event_group: 2,
      p_environment: environment, p_operation: "INCLUDE", p_layout_version: "S-1.3", p_source_type: "TSV_EMPLOYMENT", p_source_id: employment.id,
      p_employer_registration_type: eType, p_employer_registration_number: digits(employer.tax_id), p_transmitter_registration_type: tx.type, p_transmitter_registration_number: tx.number,
      p_unsigned_xml: unsigned, p_unsigned_sha256: xmlSha256(unsigned), p_signed_xml: signed.signedXml, p_signed_sha256: signed.payloadSha256
    });
    if (error) throw new Error(mensagemDeFalha("rh-tsv-special-esocial.generateTsvSpecialS2300", error));
    eventId = String(id);
  } catch (error) { fail(employmentId, error instanceof Error ? mensagemDeFalha("rh-tsv-special-esocial.generateTsvSpecialS2300", error) : "Falha ao gerar S-2300 especial."); }
  redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}
