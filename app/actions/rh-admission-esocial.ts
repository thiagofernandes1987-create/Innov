"use server";

import{redirect}from"next/navigation";
import{revalidatePath}from"next/cache";
import{requireCapability}from"@/lib/authorization";
import{signEsocialXml}from"@/lib/rh/integrations/esocial-signature";
import{buildS2190,buildS2200StandardClt}from"@/lib/rh/integrations/esocial-worker-xml";
import{xmlSha256,type EsocialEnvironment}from"@/lib/rh/integrations/esocial-xml";

function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function opt(d:FormData,k:string){return text(d,k)||null;}
function num(d:FormData,k:string){const v=text(d,k);return v===""?null:Number(v);}
function digits(v:string){return v.replace(/\D/g,"");}
function path(id:string){return `/app/rh/admissoes/${id}`;}
function fail(id:string,msg:string):never{redirect(`${path(id)}?error=${encodeURIComponent(msg)}`);}
function employerType(taxId:string):1|2{return digits(taxId).length===11?2:1;}
function establishmentType(value:string):1|3|4{if(value==="CAEPF")return 3;if(value==="CNO")return 4;return 1;}
function env(value:string):EsocialEnvironment{return value==="PRODUCTION"?"PRODUCTION":"RESTRICTED";}
function transmitter(fallbackType:1|2,fallbackNumber:string){const raw=Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE??fallbackType);return{type:(raw===2?2:1) as 1|2,number:digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER??fallbackNumber)};}

export async function saveAdmissionEsocialProfile(data:FormData){
 const caseId=text(data,"caseId");const context=await requireCapability("rh","update");
 const payload={organization_id:context.organizationId,admission_case_id:caseId,sex:text(data,"sex"),race_color:Number(text(data,"raceColor")),marital_status:num(data,"maritalStatus"),education_level:text(data,"educationLevel"),birth_country_code:text(data,"birthCountryCode")||"105",nationality_country_code:text(data,"nationalityCountryCode")||"105",street_type:opt(data,"streetType"),street:text(data,"street"),street_number:text(data,"streetNumber"),complement:opt(data,"complement"),neighborhood:opt(data,"neighborhood"),postal_code:digits(text(data,"postalCode")),city_ibge_code:digits(text(data,"cityIbgeCode")),state_code:text(data,"stateCode").toUpperCase(),esocial_category_code:text(data,"categoryCode"),activity_nature:Number(text(data,"activityNature")||1),work_regime_type:1,social_security_regime_type:Number(text(data,"socialSecurityRegimeType")||1),admission_type:1,admission_indicator:1,work_regime_journey:Number(text(data,"workRegimeJourney")||1),fixed_salary_unit:Number(text(data,"fixedSalaryUnit")||5),contract_type:Number(text(data,"contractType")||1),contract_end_date:opt(data,"contractEndDate"),reciprocal_termination_clause:opt(data,"reciprocalTerminationClause"),determined_object:opt(data,"determinedObject"),journey_type:Number(text(data,"journeyType")||9),partial_time_type:Number(text(data,"partialTimeType")||0),night_work:text(data,"nightWork")||"N",fgts_option_date:opt(data,"fgtsOptionDate"),union_base_month:num(data,"unionBaseMonth"),created_by:context.userId,updated_at:new Date().toISOString()};
 const{error}=await context.supabase.from("rh_admission_esocial_profiles").upsert(payload,{onConflict:"admission_case_id"});if(error)fail(caseId,error.message);revalidatePath(path(caseId));redirect(path(caseId));
}

async function loadAdmission(context:Awaited<ReturnType<typeof requireCapability>>,caseId:string){
 const{data:c,error}=await context.supabase.from("rh_admission_cases").select("id,full_name,cpf,birth_date,email,phone,registration_number,admission_date,base_salary,employer_id,establishment_id,position_id,union_id,work_schedule_id").eq("organization_id",context.organizationId).eq("id",caseId).maybeSingle();
 if(error||!c)throw new Error(error?.message??"Caso de admissão não encontrado.");
 const[{data:profile,error:pError},{data:employer,error:eError},{data:est,error:estError},{data:position,error:posError},{data:union,error:uError},{data:schedule,error:sError}]=await Promise.all([
  context.supabase.from("rh_admission_esocial_profiles").select("*").eq("organization_id",context.organizationId).eq("admission_case_id",caseId).maybeSingle(),
  context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",c.employer_id).maybeSingle(),
  context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("organization_id",context.organizationId).eq("id",c.establishment_id).maybeSingle(),
  c.position_id?context.supabase.from("rh_positions").select("name,cbo_code").eq("organization_id",context.organizationId).eq("id",c.position_id).maybeSingle():Promise.resolve({data:null,error:null}),
  c.union_id?context.supabase.from("rh_unions").select("tax_id").eq("organization_id",context.organizationId).eq("id",c.union_id).maybeSingle():Promise.resolve({data:null,error:null}),
  c.work_schedule_id?context.supabase.from("rh_work_schedules").select("weekly_hours,description").eq("organization_id",context.organizationId).eq("id",c.work_schedule_id).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 const err=pError??eError??estError??posError??uError??sError;if(err)throw new Error(err.message);
 if(!profile)throw new Error("Preencha o perfil eSocial da admissão.");if(!employer||!est)throw new Error("Empregador/estabelecimento não encontrado.");
 if(!c.cpf||!c.birth_date)throw new Error("CPF e data de nascimento são obrigatórios para eventos de admissão.");
 if(!position?.cbo_code)throw new Error("Cargo com CBO de 6 dígitos é obrigatório.");
 if(!union?.tax_id)throw new Error("CNPJ do sindicato é obrigatório para S-2200 CLT.");
 if(!schedule?.description)throw new Error("A jornada precisa de descrição contratual com dias/horários para S-2200.");
 return{c,profile,employer,est,position,union,schedule};
}

async function persist(context:Awaited<ReturnType<typeof requireCapability>>,input:{caseId:string;eventType:"S-2190"|"S-2200";eventKey:string;environment:EsocialEnvironment;employerType:1|2;employerNumber:string;unsignedXml:string;signedXml:string;signedSha256:string}){
 const tx=transmitter(input.employerType,input.employerNumber);if(!tx.number)throw new Error("Identificação do transmissor eSocial não configurada.");
 const{data,error}=await context.supabase.rpc("persist_rh_esocial_generated_event",{p_organization_id:context.organizationId,p_event_type:input.eventType,p_event_key:input.eventKey,p_event_group:2,p_environment:input.environment,p_operation:"INCLUDE",p_layout_version:"S-1.3",p_source_type:"ADMISSION_CASE",p_source_id:input.caseId,p_employer_registration_type:input.employerType,p_employer_registration_number:digits(input.employerNumber),p_transmitter_registration_type:tx.type,p_transmitter_registration_number:tx.number,p_unsigned_xml:input.unsignedXml,p_unsigned_sha256:xmlSha256(input.unsignedXml),p_signed_xml:input.signedXml,p_signed_sha256:input.signedSha256});
 if(error)throw new Error(error.message);return String(data);
}

export async function generateAdmissionEsocialEvent(data:FormData){
 const caseId=text(data,"caseId");const eventType=text(data,"eventType") as "S-2190"|"S-2200";const environment=env(text(data,"environment"));const context=await requireCapability("rh","update");
 if(environment==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")fail(caseId,"Produção bloqueada até homologação formal em Produção Restrita.");
 let eventId="";
 try{
  const{c,profile,employer,est,position,union,schedule}=await loadAdmission(context,caseId);const eType=employerType(employer.tax_id);let unsignedXml="";
  if(eventType==="S-2190")unsignedXml=buildS2190({environment,employerType:eType,employerNumber:employer.tax_id,cpf:c.cpf,birthDate:c.birth_date,admissionDate:c.admission_date,registrationNumber:c.registration_number,categoryCode:profile.esocial_category_code,activityNature:profile.activity_nature,cboCode:position.cbo_code,salary:Number(c.base_salary),salaryUnit:profile.fixed_salary_unit,contractType:profile.contract_type,contractEndDate:profile.contract_end_date});
  else if(eventType==="S-2200")unsignedXml=buildS2200StandardClt({environment,employerType:eType,employerNumber:employer.tax_id,cpf:c.cpf,fullName:c.full_name,sex:profile.sex,raceColor:profile.race_color,maritalStatus:profile.marital_status,educationLevel:profile.education_level,birthDate:c.birth_date,birthCountryCode:profile.birth_country_code,nationalityCountryCode:profile.nationality_country_code,address:{streetType:profile.street_type,street:profile.street,number:profile.street_number,complement:profile.complement,neighborhood:profile.neighborhood,postalCode:profile.postal_code,cityIbgeCode:profile.city_ibge_code,state:profile.state_code},phone:c.phone,email:c.email,registrationNumber:c.registration_number,workRegimeType:1,socialSecurityRegimeType:profile.social_security_regime_type,admissionDate:c.admission_date,admissionType:1,admissionIndicator:1,workRegimeJourney:profile.work_regime_journey,activityNature:profile.activity_nature,unionBaseMonth:profile.union_base_month,unionTaxId:union.tax_id,categoryCode:profile.esocial_category_code,positionName:position.name,cboCode:position.cbo_code,salary:Number(c.base_salary),salaryUnit:profile.fixed_salary_unit,contractType:profile.contract_type,contractEndDate:profile.contract_end_date,reciprocalTerminationClause:profile.reciprocal_termination_clause,determinedObject:profile.determined_object,establishmentType:establishmentType(est.registration_type),establishmentNumber:est.registration_number,weeklyHours:Number(schedule.weekly_hours),journeyType:profile.journey_type,partialTimeType:profile.partial_time_type,nightWork:profile.night_work,journeyDescription:schedule.description});
  else throw new Error("Evento de admissão não suportado.");
  const signed=signEsocialXml(unsignedXml);eventId=await persist(context,{caseId,eventType,eventKey:signed.eventKey,environment,employerType:eType,employerNumber:employer.tax_id,unsignedXml,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});
 }catch(error){fail(caseId,error instanceof Error?error.message:"Falha ao gerar evento de admissão.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}
