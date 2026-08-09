"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { signEsocialXml } from "@/lib/rh/integrations/esocial-signature";
import { buildS2200TransitionClt, type S2200CpfChange, type S2200Succession } from "@/lib/rh/integrations/esocial-worker-transition-xml";
import type { S2200ApprenticeInfo, S2200ImmigrantInfo, S2200TemporaryInfo } from "@/lib/rh/integrations/esocial-worker-xml";
import { xmlSha256, type EsocialEnvironment } from "@/lib/rh/integrations/esocial-xml";

type RhContext = Awaited<ReturnType<typeof requireCapability>>;

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { return text(data, key) || null; }
function numeric(data: FormData, key: string) { const value = text(data, key); return value === "" ? null : Number(value); }
function digits(value: string) { return value.replace(/\D/g, ""); }
function path(caseId: string) { return `/app/rh/admissoes/${caseId}/esocial-transicao`; }
function fail(caseId: string, message: string): never { redirect(`${path(caseId)}?error=${encodeURIComponent(message)}`); }
function environment(value: string): EsocialEnvironment { return value === "PRODUCTION" ? "PRODUCTION" : "RESTRICTED"; }
function employerType(taxId: string): 1 | 2 { return digits(taxId).length === 11 ? 2 : 1; }
function establishmentType(value: string): 1 | 3 | 4 { if (value === "CAEPF") return 3; if (value === "CNO") return 4; return 1; }
function cpfList(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function dayBefore(isoDate: string) { const date = new Date(`${isoDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); }
function transmitter(fallbackType: 1 | 2, fallbackNumber: string) {
  const raw = Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE ?? fallbackType);
  return { type: (raw === 2 ? 2 : 1) as 1 | 2, number: digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER ?? fallbackNumber) };
}

export async function saveAdmissionEsocialTransitionProfile(data: FormData) {
  const caseId = text(data, "caseId");
  const context = await requireCapability("rh", "update");
  const admissionType = Number(text(data, "admissionType") || 1);
  const admissionIndicator = Number(text(data, "admissionIndicator") || 1);
  if (![1, 2, 3, 4, 6, 7].includes(admissionType)) fail(caseId, "Tipo de admissão não suportado no fluxo empresarial.");
  if (![1, 2, 3].includes(admissionIndicator)) fail(caseId, "Indicativo de admissão inválido.");

  const isSuccession = [2, 3, 4, 7].includes(admissionType);
  const isCpfChange = admissionType === 6;
  const payload = {
    admission_type: admissionType,
    admission_indicator: admissionIndicator,
    original_admission_date: admissionType === 1 ? null : optional(data, "originalAdmissionDate"),
    admission_judicial_process_number: admissionIndicator === 3 ? digits(text(data, "admissionJudicialProcessNumber")) : null,
    succession_registration_type: isSuccession ? numeric(data, "successionRegistrationType") : null,
    succession_registration_number: isSuccession ? digits(text(data, "successionRegistrationNumber")) : null,
    succession_previous_registration: isSuccession ? optional(data, "successionPreviousRegistration") : null,
    succession_transfer_date: isSuccession ? optional(data, "successionTransferDate") : null,
    succession_observation: isSuccession ? optional(data, "successionObservation") : null,
    cpf_change_previous_cpf: isCpfChange ? digits(text(data, "cpfChangePreviousCpf")) : null,
    cpf_change_previous_registration: isCpfChange ? optional(data, "cpfChangePreviousRegistration") : null,
    cpf_change_date: isCpfChange ? optional(data, "cpfChangeDate") : null,
    cpf_change_observation: isCpfChange ? optional(data, "cpfChangeObservation") : null,
    updated_at: new Date().toISOString()
  };

  const { data: profile, error: profileError } = await context.supabase
    .from("rh_admission_esocial_profiles")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("admission_case_id", caseId)
    .maybeSingle();
  if (profileError) fail(caseId, profileError.message);
  if (!profile) fail(caseId, "Salve primeiro o perfil eSocial principal.");

  const { error } = await context.supabase
    .from("rh_admission_esocial_profiles")
    .update(payload)
    .eq("organization_id", context.organizationId)
    .eq("admission_case_id", caseId);
  if (error) fail(caseId, error.message);
  revalidatePath(path(caseId));
  revalidatePath(`/app/rh/admissoes/${caseId}`);
  redirect(`${path(caseId)}?success=1`);
}

function specialProfile(profile: Record<string, unknown>) {
  const nationality = String(profile.nationality_country_code ?? "105");
  const category = String(profile.esocial_category_code ?? "");
  const immigrant: S2200ImmigrantInfo | null = nationality !== "105"
    ? { residenceTerm: Number(profile.immigrant_residence_term) as 1 | 2, entryCondition: Number(profile.immigrant_entry_condition) as 1 | 2 | 3 | 4 | 5 | 6 | 7 }
    : null;
  const temporary: S2200TemporaryInfo | null = category === "106"
    ? { legalHypothesis: Number(profile.temporary_legal_hypothesis) as 1 | 2, justification: String(profile.temporary_justification ?? ""), clientRegistrationType: Number(profile.temporary_client_registration_type) as 1 | 2, clientRegistrationNumber: String(profile.temporary_client_registration_number ?? ""), substitutedCpfs: cpfList(profile.temporary_substituted_cpfs) }
    : null;
  const apprentice: S2200ApprenticeInfo | null = category === "103"
    ? { hiringMode: Number(profile.apprentice_hiring_mode) as 1 | 2, qualifyingEntityTaxId: profile.apprentice_qualifier_cnpj ? String(profile.apprentice_qualifier_cnpj) : null, indirectRegistrationType: profile.apprentice_indirect_registration_type ? Number(profile.apprentice_indirect_registration_type) as 1 | 2 : null, indirectRegistrationNumber: profile.apprentice_indirect_registration_number ? String(profile.apprentice_indirect_registration_number) : null, practiceTaxId: profile.apprentice_practice_cnpj ? String(profile.apprentice_practice_cnpj) : null }
    : null;
  return { immigrant, temporary, apprentice };
}

async function requireAcceptedCpfChangeTermination(context: RhContext, profile: Record<string, unknown>, newCpf: string) {
  const previousCpf = digits(String(profile.cpf_change_previous_cpf ?? ""));
  const previousRegistration = String(profile.cpf_change_previous_registration ?? "");
  const changeDate = String(profile.cpf_change_date ?? "");
  if (!previousCpf || !previousRegistration || !changeDate) throw new Error("Mudança de CPF sem identificação anterior completa.");

  const { data: previousPerson, error: personError } = await context.supabase
    .from("rh_people").select("id").eq("organization_id", context.organizationId).eq("cpf", previousCpf).maybeSingle();
  if (personError) throw new Error(personError.message);
  if (!previousPerson) throw new Error("CPF anterior não localizado no histórico do RH.");

  const { data: workers, error: workerError } = await context.supabase
    .from("rh_workers").select("id").eq("organization_id", context.organizationId).eq("person_id", previousPerson.id);
  if (workerError) throw new Error(workerError.message);
  const workerIds = (workers ?? []).map((item) => item.id);
  if (!workerIds.length) throw new Error("Trabalhador anterior não localizado.");

  const { data: previousEmployment, error: employmentError } = await context.supabase
    .from("rh_employments").select("id,admission_date").eq("organization_id", context.organizationId)
    .in("worker_id", workerIds).eq("registration_number", previousRegistration).maybeSingle();
  if (employmentError) throw new Error(employmentError.message);
  if (!previousEmployment) throw new Error("Matrícula anterior não localizada.");

  const expectedTermination = dayBefore(changeDate);
  const { data: termination, error: terminationError } = await context.supabase
    .from("rh_termination_cases").select("id,new_cpf,termination_date,esocial_reason_code")
    .eq("organization_id", context.organizationId).eq("employment_id", previousEmployment.id)
    .eq("esocial_reason_code", "36").eq("termination_date", expectedTermination).maybeSingle();
  if (terminationError) throw new Error(terminationError.message);
  if (!termination) throw new Error(`Mudança de CPF exige desligamento motivo 36 em ${expectedTermination}.`);
  if (digits(String(termination.new_cpf ?? "")) !== digits(newCpf)) throw new Error("Novo CPF do S-2299/36 difere do CPF da nova admissão.");

  const { data: accepted, error: eventError } = await context.supabase
    .from("rh_esocial_events").select("id").eq("organization_id", context.organizationId)
    .eq("event_type", "S-2299").eq("source_type", "TERMINATION_CASE").eq("source_id", termination.id)
    .eq("status", "ACCEPTED").limit(1).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!accepted) throw new Error("Mudança de CPF exige S-2299 motivo 36 ACCEPTED no RET.");
}

export async function generateS2200Transition(data: FormData) {
  const caseId = text(data, "caseId");
  const env = environment(text(data, "environment"));
  const context = await requireCapability("rh", "update");
  if (env === "PRODUCTION" && process.env.ESOCIAL_ENABLE_PRODUCTION !== "true") fail(caseId, "Produção bloqueada até homologação formal.");
  let eventId = "";

  try {
    const { data: admission, error: admissionError } = await context.supabase
      .from("rh_admission_cases")
      .select("id,full_name,cpf,birth_date,email,phone,registration_number,base_salary,employer_id,establishment_id,position_id,union_id,work_schedule_id")
      .eq("organization_id", context.organizationId).eq("id", caseId).maybeSingle();
    if (admissionError || !admission) throw new Error(admissionError?.message ?? "Caso de admissão não encontrado.");

    const [{ data: profile, error: profileError }, { data: employer }, { data: establishment }, { data: position }, { data: union }, { data: schedule }] = await Promise.all([
      context.supabase.from("rh_admission_esocial_profiles").select("*").eq("organization_id", context.organizationId).eq("admission_case_id", caseId).maybeSingle(),
      context.supabase.from("rh_employers").select("tax_id").eq("organization_id", context.organizationId).eq("id", admission.employer_id).maybeSingle(),
      context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("organization_id", context.organizationId).eq("id", admission.establishment_id).maybeSingle(),
      admission.position_id ? context.supabase.from("rh_positions").select("name,cbo_code").eq("organization_id", context.organizationId).eq("id", admission.position_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      admission.union_id ? context.supabase.from("rh_unions").select("tax_id").eq("organization_id", context.organizationId).eq("id", admission.union_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      admission.work_schedule_id ? context.supabase.from("rh_work_schedules").select("weekly_hours,description").eq("organization_id", context.organizationId).eq("id", admission.work_schedule_id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);
    if (profileError) throw new Error(profileError.message);
    if (!profile || !employer || !establishment || !position?.cbo_code || !union?.tax_id || !schedule?.description) throw new Error("Perfil/estrutura eSocial incompletos para S-2200.");
    if (![2, 3, 4, 6, 7].includes(Number(profile.admission_type))) throw new Error("Este comando é exclusivo de transferência/sucessão/mudança de CPF.");
    if (!profile.original_admission_date) throw new Error("Data de admissão original obrigatória.");
    if (!admission.cpf || !admission.birth_date) throw new Error("CPF e nascimento obrigatórios.");

    if (Number(profile.admission_type) === 6) await requireAcceptedCpfChangeTermination(context, profile as Record<string, unknown>, admission.cpf);

    const succession: S2200Succession | null = [2, 3, 4, 7].includes(Number(profile.admission_type))
      ? { registrationType: Number(profile.succession_registration_type) as 1 | 2 | 5 | 6, registrationNumber: String(profile.succession_registration_number ?? ""), previousRegistration: String(profile.succession_previous_registration ?? ""), transferDate: String(profile.succession_transfer_date ?? ""), observation: profile.succession_observation }
      : null;
    const cpfChange: S2200CpfChange | null = Number(profile.admission_type) === 6
      ? { previousCpf: String(profile.cpf_change_previous_cpf ?? ""), previousRegistration: String(profile.cpf_change_previous_registration ?? ""), changeDate: String(profile.cpf_change_date ?? ""), observation: profile.cpf_change_observation }
      : null;
    const special = specialProfile(profile as Record<string, unknown>);
    const eType = employerType(employer.tax_id);
    const unsigned = buildS2200TransitionClt({
      environment: env, employerType: eType, employerNumber: employer.tax_id,
      cpf: admission.cpf, fullName: admission.full_name, sex: profile.sex, raceColor: profile.race_color,
      maritalStatus: profile.marital_status, educationLevel: profile.education_level,
      birthDate: admission.birth_date, birthCountryCode: profile.birth_country_code, nationalityCountryCode: profile.nationality_country_code,
      address: { streetType: profile.street_type, street: profile.street, number: profile.street_number, complement: profile.complement, neighborhood: profile.neighborhood, postalCode: profile.postal_code, cityIbgeCode: profile.city_ibge_code, state: profile.state_code },
      phone: admission.phone, email: admission.email, immigrant: special.immigrant,
      registrationNumber: admission.registration_number, workRegimeType: 1, socialSecurityRegimeType: profile.social_security_regime_type,
      originalAdmissionDate: profile.original_admission_date, admissionType: Number(profile.admission_type) as 2 | 3 | 4 | 6 | 7,
      admissionIndicator: Number(profile.admission_indicator) as 1 | 2 | 3, judicialProcessNumber: profile.admission_judicial_process_number,
      workRegimeJourney: profile.work_regime_journey, activityNature: profile.activity_nature, unionBaseMonth: profile.union_base_month,
      unionTaxId: union.tax_id, categoryCode: profile.esocial_category_code, positionName: position.name, cboCode: position.cbo_code,
      salary: Number(admission.base_salary), salaryUnit: profile.fixed_salary_unit, contractType: profile.contract_type,
      contractEndDate: profile.contract_end_date, reciprocalTerminationClause: profile.reciprocal_termination_clause, determinedObject: profile.determined_object,
      establishmentType: establishmentType(establishment.registration_type), establishmentNumber: establishment.registration_number,
      weeklyHours: Number(schedule.weekly_hours), journeyType: profile.journey_type, partialTimeType: profile.partial_time_type,
      nightWork: profile.night_work, journeyDescription: schedule.description, fgtsOptionDate: profile.fgts_option_date,
      temporary: special.temporary, apprentice: special.apprentice, succession, cpfChange
    });
    const signed = signEsocialXml(unsigned);
    const tx = transmitter(eType, employer.tax_id);
    if (!tx.number) throw new Error("Transmissor eSocial não configurado.");
    const { data: persisted, error: persistError } = await context.supabase.rpc("persist_rh_esocial_generated_event", {
      p_organization_id: context.organizationId, p_event_type: "S-2200", p_event_key: signed.eventKey, p_event_group: 2,
      p_environment: env, p_operation: "INCLUDE", p_layout_version: "S-1.3", p_source_type: "ADMISSION_CASE", p_source_id: caseId,
      p_employer_registration_type: eType, p_employer_registration_number: digits(employer.tax_id),
      p_transmitter_registration_type: tx.type, p_transmitter_registration_number: tx.number,
      p_unsigned_xml: unsigned, p_unsigned_sha256: xmlSha256(unsigned), p_signed_xml: signed.signedXml, p_signed_sha256: signed.payloadSha256
    });
    if (persistError) throw new Error(persistError.message);
    eventId = String(persisted);
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : "Falha ao gerar S-2200 de transição.");
  }

  redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}
