import Link from "next/link";
import { notFound } from "next/navigation";
import { generateTsvS2300, saveTsvEsocialProfile } from "@/app/actions/rh-tsv-esocial";
import { requireCapability } from "@/lib/authorization";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  ["701", "Autônomo em geral"], ["711", "Transportador autônomo de passageiros"], ["712", "Transportador autônomo de carga"],
  ["721", "Diretor não empregado, com FGTS"], ["722", "Diretor não empregado, sem FGTS"], ["723", "Empresário, sócio ou conselheiro"],
  ["731", "Cooperado de cooperativa de trabalho"], ["734", "Transportador cooperado"], ["738", "Cooperado de produção"],
  ["741", "Microempreendedor individual"], ["751", "Magistrado classista temporário aposentado"], ["761", "Dirigente eleito de entidade/condomínio"],
  ["771", "Membro de conselho tutelar"], ["781", "Ministro religioso/membro de ordem religiosa"],
  ["901", "Estagiário"], ["906", "Serviço civil voluntário"]
] as const;

function one<T>(value: T | T[] | null | undefined) { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

export default async function TsvDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("rh", "read");

  const [{ data: employment, error }, { data: profile }, { data: event }] = await Promise.all([
    context.supabase
      .from("rh_employments")
      .select("id,registration_number,employment_type,admission_date,base_salary,status,rh_workers(worker_code,rh_people(full_name,preferred_name,cpf,birth_date,email,phone)),rh_employment_conditions(valid_from,employer_id,establishment_id,position_id,base_salary,rh_employers(legal_name),rh_establishments(name),rh_positions(name,cbo_code))")
      .eq("organization_id", context.organizationId).eq("id", id).maybeSingle(),
    context.supabase.from("rh_tsv_esocial_profiles").select("*").eq("organization_id", context.organizationId).eq("employment_id", id).maybeSingle(),
    context.supabase.from("rh_esocial_events").select("id,status,receipt_number,created_at").eq("organization_id", context.organizationId).eq("event_type", "S-2300").eq("source_type", "TSV_EMPLOYMENT").eq("source_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  if (error) throw new Error(error.message);
  if (!employment) notFound();
  const worker = one(employment.rh_workers);
  const person = worker ? one(worker.rh_people) : null;
  const conditions = Array.isArray(employment.rh_employment_conditions) ? [...employment.rh_employment_conditions] : [];
  const condition = conditions.sort((a, b) => String(b.valid_from ?? "").localeCompare(String(a.valid_from ?? "")))[0] ?? null;
  const establishment = condition ? one(condition.rh_establishments) : null;
  const position = condition ? one(condition.rh_positions) : null;
  const employer = condition ? one(condition.rh_employers) : null;
  const category = String(profile?.category_code ?? "721");
  const localRequired = ["721", "722", "723", "731", "734", "738", "761", "771", "901", "906"].includes(category);
  const studentCategory = category === "901" || category === "906";

  return <main className="content">
    <section className="page-heading"><div><span className="badge">TSVE · {employment.registration_number}</span><h1>{person?.preferred_name || person?.full_name || worker?.worker_code}</h1><p>Início {employment.admission_date} · {employment.employment_type}. A vertical cobre contribuinte individual 7XX, estagiário 901 e serviço civil voluntário 906; grupos próprios de avulso, dirigente sindical, cedido e mandato eletivo continuam separados.</p></div><Link className="button button-secondary" href="/app/rh/tsv">Voltar</Link></section>
    {query.error ? <div className="validation blocking">{query.error}</div> : null}
    {query.success ? <div className="validation">Perfil S-2300 salvo.</div> : null}

    <section className="stats-grid"><article className="card"><small>CPF</small><strong>{person?.cpf ?? "—"}</strong></article><article className="card"><small>CATEGORIA</small><strong>{category}</strong></article><article className="card"><small>LOCAL</small><strong>{localRequired ? establishment?.name ?? "ausente" : "não exigido"}</strong></article><article className="card"><small>S-2300</small><strong>{event?.status ?? "NÃO GERADO"}</strong></article></section>

    <form action={saveTsvEsocialProfile} className="relationship-form">
      <input type="hidden" name="employmentId" value={employment.id} />
      <section className="card card-pad"><span className="eyebrow">IDENTIFICAÇÃO</span><h2>Perfil eSocial do TSVE</h2><div className="form-grid">
        <label className="span-2"><span>Categoria eSocial *</span><select name="categoryCode" required defaultValue={category}>{CATEGORIES.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label>
        <label><span>Sexo *</span><select name="sex" required defaultValue={profile?.sex ?? "M"}><option value="M">Masculino</option><option value="F">Feminino</option></select></label>
        <label><span>Raça/cor *</span><select name="raceColor" required defaultValue={profile?.race_color ?? 3}><option value="1">Branca</option><option value="2">Preta</option><option value="3">Parda</option><option value="4">Amarela</option><option value="5">Indígena</option></select></label>
        <label><span>Estado civil</span><select name="maritalStatus" defaultValue={profile?.marital_status ?? ""}><option value="">Não informar</option><option value="1">Solteiro</option><option value="2">Casado</option><option value="3">Divorciado</option><option value="4">Separado</option><option value="5">Viúvo</option></select></label>
        <label><span>Grau de instrução *</span><input name="educationLevel" required defaultValue={profile?.education_level ?? "07"} placeholder="01..12" /></label>
        <label><span>País nascimento *</span><input name="birthCountryCode" required defaultValue={profile?.birth_country_code ?? "105"} /></label>
        <label><span>Nacionalidade *</span><input name="nationalityCountryCode" required defaultValue={profile?.nationality_country_code ?? "105"} /></label>
      </div></section>

      <section className="card card-pad"><span className="eyebrow">ENDEREÇO</span><div className="form-grid">
        <label><span>Tipo logradouro</span><input name="streetType" defaultValue={profile?.street_type ?? "R"} /></label><label className="span-2"><span>Logradouro *</span><input name="street" required defaultValue={profile?.street ?? ""} /></label><label><span>Número *</span><input name="streetNumber" required defaultValue={profile?.street_number ?? ""} /></label><label><span>Complemento</span><input name="complement" defaultValue={profile?.complement ?? ""} /></label><label><span>Bairro</span><input name="neighborhood" defaultValue={profile?.neighborhood ?? ""} /></label><label><span>CEP *</span><input name="postalCode" required defaultValue={profile?.postal_code ?? ""} /></label><label><span>Município IBGE *</span><input name="cityIbgeCode" required defaultValue={profile?.city_ibge_code ?? ""} /></label><label><span>UF *</span><input name="stateCode" required maxLength={2} defaultValue={profile?.state_code ?? "SP"} /></label>
      </div></section>

      <section className="card card-pad"><span className="eyebrow">IMIGRANTE</span><div className="form-grid"><label><span>Tempo residência</span><select name="immigrantResidenceTerm" defaultValue={profile?.immigrant_residence_term ?? ""}><option value="">Não informar</option><option value="1">Indeterminado</option><option value="2">Determinado</option></select></label><label><span>Condição ingresso</span><select name="immigrantEntryCondition" defaultValue={profile?.immigrant_entry_condition ?? ""}><option value="">Não informar</option>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div></section>

      <section className="card card-pad"><span className="eyebrow">REMUNERAÇÃO / FGTS</span><div className="form-grid">
        <label><span>Unidade salário *</span><select name="salaryUnit" required defaultValue={profile?.salary_unit ?? 5}><option value="1">Hora</option><option value="2">Dia</option><option value="3">Semana</option><option value="4">Quinzena</option><option value="5">Mês</option><option value="6">Tarefa</option><option value="7">Exclusivamente variável</option></select></label>
        <label className="span-2"><span>Descrição variável/tarefa</span><input name="variableSalaryDescription" defaultValue={profile?.variable_salary_description ?? ""} /></label>
        <label><span>Data opção FGTS — somente categoria 721</span><input name="fgtsOptionDate" type="date" defaultValue={category === "721" ? profile?.fgts_option_date ?? employment.admission_date : ""} /></label>
        <label><span>Processo judicial de início</span><input name="judicialProcessNumber" defaultValue={profile?.judicial_process_number ?? ""} placeholder="20 dígitos" /></label>
      </div><p className="validation">Cargo/CBO e remuneração base são lidos da condição vigente: {condition ? ` ${position?.name ?? "cargo opcional/ausente"} · ${employer?.legal_name ?? "empresa"}` : " condição ainda não cadastrada"}. Na categoria 906 a remuneração é obrigatória; na 901 pode ser omitida se não houver bolsa/remuneração fixa.</p></section>

      <section className="card card-pad"><span className="eyebrow">ESTÁGIO / SERVIÇO CIVIL · 901/906</span><h2>Grupo infoEstagiario</h2><p>Preencha esta seção somente para categorias 901 e 906. Para 906, a natureza deve ser N e agente/supervisor não são admitidos.</p><div className="form-grid">
        <label><span>Natureza</span><select name="internshipNature" defaultValue={profile?.internship_nature ?? (category === "906" ? "N" : "O")}><option value="O">O · Obrigatório</option><option value="N">N · Não obrigatório</option></select></label>
        <label><span>Nível — obrigatório 901</span><select name="internshipLevel" defaultValue={profile?.internship_level ?? ""}><option value="">Não informar</option><option value="1">Fundamental</option><option value="2">Médio</option><option value="3">Formação profissional</option><option value="4">Superior</option><option value="8">Especial</option><option value="9">Mãe social — somente 901</option></select></label>
        <label className="span-2"><span>Área de atuação / jornada semanal</span><input name="internshipArea" maxLength={100} defaultValue={profile?.internship_area ?? ""} /></label>
        <label><span>Nº apólice seguro</span><input name="internshipPolicyNumber" maxLength={30} defaultValue={profile?.internship_policy_number ?? ""} /></label>
        <label><span>Término previsto *</span><input type="date" name="internshipExpectedEnd" defaultValue={profile?.internship_expected_end ?? ""} /></label>
        <label className="span-2"><span>CNPJ instituição de ensino/formação</span><input name="educationInstitutionCnpj" inputMode="numeric" defaultValue={profile?.education_institution_cnpj ?? ""} placeholder="Se houver CNPJ, não preencha o endereço abaixo" /></label>
        <label className="span-2"><span>Razão social — se sem CNPJ</span><input name="educationInstitutionName" defaultValue={profile?.education_institution_name ?? ""} /></label>
        <label className="span-2"><span>Logradouro instituição — se sem CNPJ</span><input name="educationInstitutionStreet" defaultValue={profile?.education_institution_street ?? ""} /></label>
        <label><span>Número instituição</span><input name="educationInstitutionNumber" defaultValue={profile?.education_institution_number ?? ""} /></label>
        <label><span>Bairro instituição</span><input name="educationInstitutionNeighborhood" defaultValue={profile?.education_institution_neighborhood ?? ""} /></label>
        <label><span>CEP instituição</span><input name="educationInstitutionPostalCode" inputMode="numeric" defaultValue={profile?.education_institution_postal_code ?? ""} /></label>
        <label><span>Município IBGE instituição</span><input name="educationInstitutionCityIbgeCode" inputMode="numeric" defaultValue={profile?.education_institution_city_ibge_code ?? ""} /></label>
        <label><span>UF instituição</span><input name="educationInstitutionStateCode" maxLength={2} defaultValue={profile?.education_institution_state_code ?? ""} /></label>
        <label><span>CNPJ agente integração — somente 901</span><input name="integrationAgentCnpj" inputMode="numeric" defaultValue={profile?.integration_agent_cnpj ?? ""} /></label>
        <label><span>CPF supervisor — somente 901</span><input name="internshipSupervisorCpf" inputMode="numeric" defaultValue={profile?.internship_supervisor_cpf ?? ""} /></label>
      </div></section>

      <div className="form-actions"><button className="button button-primary" type="submit">Salvar perfil S-2300</button></div>
    </form>

    <section className="card card-pad"><span className="eyebrow">PRODUÇÃO RESTRITA</span><h2>Gerar e assinar S-2300</h2><form action={generateTsvS2300}><input type="hidden" name="employmentId" value={employment.id} /><input type="hidden" name="environment" value="RESTRICTED" /><button className="button button-primary" type="submit" disabled={!profile || !condition}>Gerar + assinar S-2300</button></form>{studentCategory ? <p className="validation">O XML inclui infoEstagiario e local de trabalho conforme a categoria e a data de início.</p> : null}{event ? <p>Último evento: <Link className="text-link" href={`/app/rh/obrigacoes/esocial/eventos/${event.id}`}>{event.status}{event.receipt_number ? ` · recibo ${event.receipt_number}` : ""}</Link></p> : null}</section>
  </main>;
}
