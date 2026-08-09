"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import {
  buildS2300Contributor,
  S2300_CONTRIBUTOR_CATEGORIES,
  type S2300ContributorCategory
} from "@/lib/rh/integrations/esocial-tsv-xml";
import {
  buildS2300Student,
  type S2300EducationInstitution,
  type S2300StudentCategory
} from "@/lib/rh/integrations/esocial-tsv-student-xml";
import { signEsocialXml } from "@/lib/rh/integrations/esocial-signature";
import { xmlSha256, type EsocialEnvironment } from "@/lib/rh/integrations/esocial-xml";

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function num(data: FormData, key: string) { const value = text(data, key); return value ? Number(value) : null; }
function digits(value: string) { return value.replace(/\D/g, ""); }
function env(value: string): EsocialEnvironment { return value === "PRODUCTION" ? "PRODUCTION" : "RESTRICTED"; }
function employerType(value: string): 1 | 2 { return digits(value).length === 11 ? 2 : 1; }
function estType(value: string): 1 | 3 | 4 { return value === "CAEPF" ? 3 : value === "CNO" ? 4 : 1; }
function path(id: string) { return `/app/rh/tsv/${id}`; }
function fail(id: string, message: string): never { redirect(`${path(id)}?error=${encodeURIComponent(message)}`); }
function transmitter(type: 1 | 2, number: string) {
  const raw = Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE ?? type);
  return { type: (raw === 2 ? 2 : 1) as 1 | 2, number: digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER ?? number) };
}
function isContributorCategory(value: string): value is S2300ContributorCategory {
  return (S2300_CONTRIBUTOR_CATEGORIES as readonly string[]).includes(value);
}
function isStudentCategory(value: string): value is S2300StudentCategory { return value === "901" || value === "906"; }
function nullableDigits(data: FormData, key: string) { const value = digits(text(data, key)); return value || null; }

export async function saveTsvEsocialProfile(data: FormData) {
  const employmentId = text(data, "employmentId");
  const context = await requireCapability("rh", "update");
  const categoryCode = text(data, "categoryCode") || "721";
  if (!isContributorCategory(categoryCode) && !isStudentCategory(categoryCode)) fail(employmentId, "Categoria S-2300 ainda não suportada por esta vertical.");
  const student = isStudentCategory(categoryCode);
  const institutionCnpj = student ? nullableDigits(data, "educationInstitutionCnpj") : null;

  const payload = {
    organization_id: context.organizationId,
    employment_id: employmentId,
    category_code: categoryCode,
    sex: text(data, "sex"),
    race_color: Number(text(data, "raceColor")),
    marital_status: num(data, "maritalStatus"),
    education_level: text(data, "educationLevel"),
    birth_country_code: text(data, "birthCountryCode") || "105",
    nationality_country_code: text(data, "nationalityCountryCode") || "105",
    street_type: text(data, "streetType") || null,
    street: text(data, "street"),
    street_number: text(data, "streetNumber"),
    complement: text(data, "complement") || null,
    neighborhood: text(data, "neighborhood") || null,
    postal_code: digits(text(data, "postalCode")),
    city_ibge_code: digits(text(data, "cityIbgeCode")),
    state_code: text(data, "stateCode").toUpperCase(),
    immigrant_residence_term: num(data, "immigrantResidenceTerm"),
    immigrant_entry_condition: num(data, "immigrantEntryCondition"),
    salary_unit: Number(text(data, "salaryUnit") || 5),
    variable_salary_description: text(data, "variableSalaryDescription") || null,
    fgts_option_date: categoryCode === "721" ? text(data, "fgtsOptionDate") || null : null,
    judicial_process_number: text(data, "judicialProcessNumber") ? digits(text(data, "judicialProcessNumber")) : null,
    internship_nature: student ? text(data, "internshipNature") || null : null,
    internship_level: student ? num(data, "internshipLevel") : null,
    internship_area: student ? text(data, "internshipArea") || null : null,
    internship_policy_number: student ? text(data, "internshipPolicyNumber") || null : null,
    internship_expected_end: student ? text(data, "internshipExpectedEnd") || null : null,
    education_institution_cnpj: institutionCnpj,
    education_institution_name: student && !institutionCnpj ? text(data, "educationInstitutionName") || null : null,
    education_institution_street: student && !institutionCnpj ? text(data, "educationInstitutionStreet") || null : null,
    education_institution_number: student && !institutionCnpj ? text(data, "educationInstitutionNumber") || null : null,
    education_institution_neighborhood: student && !institutionCnpj ? text(data, "educationInstitutionNeighborhood") || null : null,
    education_institution_postal_code: student && !institutionCnpj ? nullableDigits(data, "educationInstitutionPostalCode") : null,
    education_institution_city_ibge_code: student && !institutionCnpj ? nullableDigits(data, "educationInstitutionCityIbgeCode") : null,
    education_institution_state_code: student && !institutionCnpj ? text(data, "educationInstitutionStateCode").toUpperCase() || null : null,
    integration_agent_cnpj: categoryCode === "901" ? nullableDigits(data, "integrationAgentCnpj") : null,
    internship_supervisor_cpf: categoryCode === "901" ? nullableDigits(data, "internshipSupervisorCpf") : null,
    created_by: context.userId,
    updated_at: new Date().toISOString()
  };
  const { error } = await context.supabase.from("rh_tsv_esocial_profiles").upsert(payload, { onConflict: "employment_id" });
  if (error) fail(employmentId, error.message);
  revalidatePath(path(employmentId));
  redirect(`${path(employmentId)}?success=${encodeURIComponent("Perfil eSocial do TSVE salvo.")}`);
}

export async function generateTsvS2300(data: FormData) {
  const employmentId = text(data, "employmentId");
  const environment = env(text(data, "environment"));
  if (environment === "PRODUCTION" && process.env.ESOCIAL_ENABLE_PRODUCTION !== "true") fail(employmentId, "Produção eSocial bloqueada.");
  const context = await requireCapability("rh", "update");
  try {
    const { data: employment, error: empError } = await context.supabase.from("rh_employments").select("id,worker_id,registration_number,admission_date,base_salary,status").eq("organization_id", context.organizationId).eq("id", employmentId).maybeSingle();
    if (empError || !employment) throw new Error(empError?.message ?? "Vínculo TSVE não encontrado.");
    const [{ data: worker }, { data: profile, error: profileError }, { data: condition }] = await Promise.all([
      context.supabase.from("rh_workers").select("person_id").eq("organization_id", context.organizationId).eq("id", employment.worker_id).single(),
      context.supabase.from("rh_tsv_esocial_profiles").select("*").eq("organization_id", context.organizationId).eq("employment_id", employment.id).maybeSingle(),
      context.supabase.from("rh_employment_conditions").select("employer_id,establishment_id,position_id,base_salary").eq("organization_id", context.organizationId).eq("employment_id", employment.id).lte("valid_from", employment.admission_date).order("valid_from", { ascending: false }).limit(1).maybeSingle()
    ]);
    if (!worker?.person_id || profileError || !profile || !condition) throw new Error(profileError?.message ?? "Perfil/condição eSocial do TSVE incompleto.");
    if (!isContributorCategory(profile.category_code) && !isStudentCategory(profile.category_code)) throw new Error("Categoria S-2300 ainda não suportada pelo gerador.");
    const contributor = isContributorCategory(profile.category_code);
    const student = isStudentCategory(profile.category_code);
    if (!contributor && !student) throw new Error("Categoria TSVE inválida.");
    const [{ data: person }, { data: employer }, { data: establishment }, { data: position }] = await Promise.all([
      context.supabase.from("rh_people").select("full_name,cpf,birth_date,phone,email").eq("organization_id", context.organizationId).eq("id", worker.person_id).single(),
      context.supabase.from("rh_employers").select("tax_id").eq("organization_id", context.organizationId).eq("id", condition.employer_id).single(),
      context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("organization_id", context.organizationId).eq("id", condition.establishment_id).single(),
      condition.position_id ? context.supabase.from("rh_positions").select("name,cbo_code").eq("organization_id", context.organizationId).eq("id", condition.position_id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);
    if (!person?.cpf || !person.birth_date || !employer?.tax_id || !establishment) throw new Error("Cadastro mestre incompleto para S-2300.");
    if (contributor && (!position?.name || !position.cbo_code)) throw new Error("Contribuinte individual S-2300 exige cargo/CBO no caminho atual.");
    const eType = employerType(employer.tax_id);
    const immigrant = profile.nationality_country_code !== "105"
      ? { residenceTerm: profile.immigrant_residence_term as 1 | 2, entryCondition: profile.immigrant_entry_condition as 1 | 2 | 3 | 4 | 5 | 6 | 7 }
      : null;
    const common = {
      environment,
      employerType: eType,
      employerNumber: employer.tax_id,
      cpf: person.cpf,
      fullName: person.full_name,
      sex: profile.sex as "M" | "F",
      raceColor: profile.race_color as 1 | 2 | 3 | 4 | 5,
      maritalStatus: profile.marital_status as 1 | 2 | 3 | 4 | 5 | null,
      educationLevel: profile.education_level,
      birthDate: person.birth_date,
      birthCountryCode: profile.birth_country_code,
      nationalityCountryCode: profile.nationality_country_code,
      address: { streetType: profile.street_type, street: profile.street, number: profile.street_number, complement: profile.complement, neighborhood: profile.neighborhood, postalCode: profile.postal_code, cityIbgeCode: profile.city_ibge_code, state: profile.state_code },
      phone: person.phone,
      email: person.email,
      immigrant,
      registrationNumber: employment.registration_number,
      startDate: employment.admission_date,
      judicialProcessNumber: profile.judicial_process_number,
      establishmentType: estType(establishment.registration_type),
      establishmentNumber: establishment.registration_number
    };

    let unsigned: string;
    if (contributor) {
      unsigned = buildS2300Contributor({
        ...common,
        categoryCode: profile.category_code,
        positionName: position!.name,
        cboCode: position!.cbo_code,
        salary: Number(condition.base_salary ?? employment.base_salary),
        salaryUnit: profile.salary_unit,
        variableSalaryDescription: profile.variable_salary_description,
        fgtsOptionDate: profile.category_code === "721" ? profile.fgts_option_date : null
      });
    } else {
      const institution: S2300EducationInstitution = profile.education_institution_cnpj
        ? { cnpj: profile.education_institution_cnpj }
        : {
            cnpj: null,
            name: String(profile.education_institution_name ?? ""),
            street: String(profile.education_institution_street ?? ""),
            number: String(profile.education_institution_number ?? ""),
            neighborhood: String(profile.education_institution_neighborhood ?? ""),
            postalCode: profile.education_institution_postal_code,
            cityIbgeCode: profile.education_institution_city_ibge_code,
            state: profile.education_institution_state_code
          };
      const salary = Number(condition.base_salary ?? employment.base_salary);
      unsigned = buildS2300Student({
        ...common,
        categoryCode: profile.category_code as S2300StudentCategory,
        positionName: position?.name ?? null,
        cboCode: position?.cbo_code ?? null,
        salary: profile.category_code === "906" || salary > 0 ? salary : null,
        salaryUnit: profile.category_code === "906" || salary > 0 ? profile.salary_unit : null,
        variableSalaryDescription: profile.variable_salary_description,
        student: {
          nature: profile.internship_nature as "O" | "N",
          level: profile.internship_level as 1 | 2 | 3 | 4 | 8 | 9 | null,
          area: profile.internship_area,
          policyNumber: profile.internship_policy_number,
          expectedEndDate: profile.internship_expected_end,
          institution,
          integrationAgentCnpj: profile.integration_agent_cnpj,
          supervisorCpf: profile.internship_supervisor_cpf
        }
      });
    }

    const signed = signEsocialXml(unsigned);
    const tx = transmitter(eType, employer.tax_id);
    if (!tx.number) throw new Error("Transmissor eSocial não configurado.");
    const { data: id, error } = await context.supabase.rpc("persist_rh_esocial_generated_event", {
      p_organization_id: context.organizationId,
      p_event_type: "S-2300",
      p_event_key: signed.eventKey,
      p_event_group: 2,
      p_environment: environment,
      p_operation: "INCLUDE",
      p_layout_version: "S-1.3",
      p_source_type: "TSV_EMPLOYMENT",
      p_source_id: employment.id,
      p_employer_registration_type: eType,
      p_employer_registration_number: digits(employer.tax_id),
      p_transmitter_registration_type: tx.type,
      p_transmitter_registration_number: tx.number,
      p_unsigned_xml: unsigned,
      p_unsigned_sha256: xmlSha256(unsigned),
      p_signed_xml: signed.signedXml,
      p_signed_sha256: signed.payloadSha256
    });
    if (error) throw new Error(error.message);
    redirect(`/app/rh/obrigacoes/esocial/eventos/${id}`);
  } catch (error) {
    fail(employmentId, error instanceof Error ? error.message : "Falha ao gerar S-2300.");
  }
}
