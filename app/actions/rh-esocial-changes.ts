"use server";

import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{lerMoeda}from"@/lib/validacao/moeda";
import{signEsocialXml}from"@/lib/rh/integrations/esocial-signature";
import{buildS2205Brazil,buildS2206StandardClt}from"@/lib/rh/integrations/esocial-change-xml";
import{xmlSha256,type EsocialEnvironment}from"@/lib/rh/integrations/esocial-xml";

function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function opt(d:FormData,k:string){return text(d,k)||null;}
function num(d:FormData,k:string){const v=text(d,k);return v===""?null:Number(v.replace(",","."));}
function money(d:FormData,k:string){return lerMoeda(text(d,k));}
function digits(v:string){return v.replace(/\D/g,"");}
function page(workerId:string){return `/app/rh/pessoas/${workerId}/alteracoes`;}
function fail(workerId:string,msg:string):never{redirect(`${page(workerId)}?error=${encodeURIComponent(msg)}`);}
function environment(v:string):EsocialEnvironment{return v==="PRODUCTION"?"PRODUCTION":"RESTRICTED";}
function employerType(v:string):1|2{return digits(v).length===11?2:1;}
function establishmentType(v:string):1|3|4{if(v==="CAEPF")return 3;if(v==="CNO")return 4;return 1;}
function transmitter(fallbackType:1|2,fallbackNumber:string){const raw=Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE??fallbackType);return{type:(raw===2?2:1) as 1|2,number:digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER??fallbackNumber)};}

async function requireAcceptedS2200(context:Awaited<ReturnType<typeof requireCapability>>,workerId:string){
 const{data:cases,error}=await context.supabase.from("rh_admission_cases").select("id").eq("organization_id",context.organizationId).eq("activated_worker_id",workerId);if(error)throw new Error(error.message);
 const ids=(cases??[]).map(c=>c.id);if(!ids.length)throw new Error("Vínculo sem caso de admissão correlacionado ao eSocial.");
 const{data:event,error:eError}=await context.supabase.from("rh_esocial_events").select("id,receipt_number").eq("organization_id",context.organizationId).eq("event_type","S-2200").eq("status","ACCEPTED").in("source_id",ids).order("processed_at",{ascending:false}).limit(1).maybeSingle();
 if(eError)throw new Error(eError.message);if(!event)throw new Error("S-2200 ainda não está ACCEPTED no RET; S-2205/S-2206 permanecem bloqueados.");return event;
}

async function persist(context:Awaited<ReturnType<typeof requireCapability>>,input:{eventType:string,eventKey:string;sourceType:string;sourceId:string;environment:EsocialEnvironment;employerType:1|2;employerNumber:string;unsignedXml:string;signedXml:string;signedSha256:string}){
 const tx=transmitter(input.employerType,input.employerNumber);if(!tx.number)throw new Error("Identificação do transmissor eSocial não configurada.");
 const{data,error}=await context.supabase.rpc("persist_rh_esocial_generated_event",{p_organization_id:context.organizationId,p_event_type:input.eventType,p_event_key:input.eventKey,p_event_group:2,p_environment:input.environment,p_operation:"INCLUDE",p_layout_version:"S-1.3",p_source_type:input.sourceType,p_source_id:input.sourceId,p_employer_registration_type:input.employerType,p_employer_registration_number:digits(input.employerNumber),p_transmitter_registration_type:tx.type,p_transmitter_registration_number:tx.number,p_unsigned_xml:input.unsignedXml,p_unsigned_sha256:xmlSha256(input.unsignedXml),p_signed_xml:input.signedXml,p_signed_sha256:input.signedSha256});
 if(error)throw new Error(error.message);return String(data);
}

export async function createRhPersonalEsocialChange(data:FormData){
 const workerId=text(data,"workerId");const context=await requireCapability("rh","update");
 const{data:profileId,error}=await context.supabase.rpc("create_rh_worker_esocial_profile_version",{p_worker_id:workerId,p_valid_from:text(data,"validFrom"),p_full_name:text(data,"fullName"),p_social_name:opt(data,"socialName"),p_sex:text(data,"sex"),p_race_color:Number(text(data,"raceColor")),p_marital_status:num(data,"maritalStatus"),p_education_level:text(data,"educationLevel"),p_nationality_country_code:text(data,"nationalityCountryCode"),p_street_type:opt(data,"streetType"),p_street:text(data,"street"),p_street_number:text(data,"streetNumber"),p_complement:opt(data,"complement"),p_neighborhood:opt(data,"neighborhood"),p_postal_code:digits(text(data,"postalCode")),p_city_ibge_code:digits(text(data,"cityIbgeCode")),p_state_code:text(data,"stateCode").toUpperCase(),p_phone:opt(data,"phone"),p_email:opt(data,"email"),p_reason:opt(data,"reason")});
 if(error)fail(workerId,error.message);redirect(`${page(workerId)}?createdProfile=${encodeURIComponent(String(profileId))}`);
}

export async function createRhContractEsocialChange(data:FormData){
 const workerId=text(data,"workerId");const context=await requireCapability("rh","update");const salary=money(data,"baseSalary");if(salary==null)fail(workerId,"Salário obrigatório.");
 const{data:conditionId,error}=await context.supabase.rpc("create_rh_contract_change",{p_employment_id:text(data,"employmentId"),p_valid_from:text(data,"validFrom"),p_effect_date:opt(data,"effectDate"),p_description:opt(data,"description"),p_employer_id:text(data,"employerId"),p_establishment_id:text(data,"establishmentId"),p_tax_allocation_id:opt(data,"taxAllocationId"),p_position_id:opt(data,"positionId"),p_function_id:opt(data,"functionId"),p_union_id:text(data,"unionId"),p_work_schedule_id:text(data,"workScheduleId"),p_base_salary:salary,p_social_security_regime_type:Number(text(data,"socialSecurityRegimeType")||1),p_work_regime_journey:Number(text(data,"workRegimeJourney")||1),p_activity_nature:Number(text(data,"activityNature")||1),p_union_base_month:num(data,"unionBaseMonth"),p_fixed_salary_unit:Number(text(data,"fixedSalaryUnit")||5),p_contract_type:Number(text(data,"contractType")||1),p_contract_end_date:opt(data,"contractEndDate"),p_reciprocal_termination_clause:opt(data,"reciprocalTerminationClause"),p_determined_object:opt(data,"determinedObject"),p_journey_type:Number(text(data,"journeyType")||9),p_partial_time_type:Number(text(data,"partialTimeType")||0),p_night_work:text(data,"nightWork")||"N"});
 if(error)fail(workerId,error.message);redirect(`${page(workerId)}?createdCondition=${encodeURIComponent(String(conditionId))}`);
}

export async function generateRhEsocialChangeEvent(data:FormData){
 const workerId=text(data,"workerId");const eventType=text(data,"eventType");const sourceId=text(data,"sourceId");const env=environment(text(data,"environment"));const context=await requireCapability("rh","update");
 if(env==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")fail(workerId,"Produção bloqueada até homologação em Produção Restrita.");let eventId="";
 try{
  await requireAcceptedS2200(context,workerId);
  const{data:worker,error:wError}=await context.supabase.from("rh_workers").select("id,person_id").eq("organization_id",context.organizationId).eq("id",workerId).maybeSingle();if(wError||!worker)throw new Error(wError?.message??"Trabalhador não encontrado.");
  const{data:person,error:pError}=await context.supabase.from("rh_people").select("cpf").eq("organization_id",context.organizationId).eq("id",worker.person_id).maybeSingle();if(pError||!person?.cpf)throw new Error(pError?.message??"CPF do trabalhador ausente.");
  if(eventType==="S-2205"){
   const employmentId=text(data,"employmentId");const[{data:profile,error:prError},{data:condition,error:cError}]=await Promise.all([
    context.supabase.from("rh_worker_esocial_profiles").select("*").eq("organization_id",context.organizationId).eq("id",sourceId).eq("worker_id",workerId).maybeSingle(),
    context.supabase.from("rh_employment_conditions").select("employer_id").eq("organization_id",context.organizationId).eq("employment_id",employmentId).lte("valid_from",text(data,"changeDate")).or(`valid_to.is.null,valid_to.gt.${text(data,"changeDate")}`).order("valid_from",{ascending:false}).limit(1).maybeSingle()
   ]);if(prError||!profile)throw new Error(prError?.message??"Versão cadastral não encontrada.");if(cError||!condition)throw new Error(cError?.message??"Condição contratual vigente não encontrada.");
   const{data:employer,error:eError}=await context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",condition.employer_id).maybeSingle();if(eError||!employer)throw new Error(eError?.message??"Empregador não encontrado.");const eType=employerType(employer.tax_id);
   const unsigned=buildS2205Brazil({environment:env,employerType:eType,employerNumber:employer.tax_id,cpf:person.cpf,changeDate:profile.valid_from,fullName:profile.full_name,socialName:profile.social_name,sex:profile.sex as "M"|"F",raceColor:profile.race_color as 1|2|3|4|5,maritalStatus:profile.marital_status as 1|2|3|4|5|null,educationLevel:profile.education_level,nationalityCountryCode:profile.nationality_country_code,address:{streetType:profile.street_type,street:profile.street,number:profile.street_number,complement:profile.complement,neighborhood:profile.neighborhood,postalCode:profile.postal_code,cityIbgeCode:profile.city_ibge_code,state:profile.state_code},phone:profile.phone,email:profile.email});const signed=signEsocialXml(unsigned);
   eventId=await persist(context,{eventType,sourceType:"WORKER_ESOCIAL_PROFILE",sourceId,environment:env,eventKey:signed.eventKey,employerType:eType,employerNumber:employer.tax_id,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});
  }else if(eventType==="S-2206"){
   const{data:condition,error:cError}=await context.supabase.from("rh_employment_conditions").select("id,employment_id,valid_from,employer_id,establishment_id,position_id,function_id,union_id,work_schedule_id,base_salary,esocial_category_code,change_reason").eq("organization_id",context.organizationId).eq("id",sourceId).maybeSingle();if(cError||!condition)throw new Error(cError?.message??"Condição contratual não encontrada.");
   const[{data:employment},{data:profile},{data:employer},{data:est},{data:position},{data:fn},{data:union},{data:schedule}]=await Promise.all([
    context.supabase.from("rh_employments").select("registration_number").eq("id",condition.employment_id).single(),
    context.supabase.from("rh_employment_esocial_contract_profiles").select("*").eq("organization_id",context.organizationId).eq("source_type","CONTRACT_CHANGE").eq("source_id",condition.id).maybeSingle(),
    context.supabase.from("rh_employers").select("tax_id").eq("id",condition.employer_id).single(),
    context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("id",condition.establishment_id).single(),
    context.supabase.from("rh_positions").select("name,cbo_code").eq("id",condition.position_id).maybeSingle(),
    condition.function_id?context.supabase.from("rh_functions").select("name").eq("id",condition.function_id).maybeSingle():Promise.resolve({data:null,error:null}),
    context.supabase.from("rh_unions").select("tax_id").eq("id",condition.union_id).single(),
    context.supabase.from("rh_work_schedules").select("weekly_hours,description").eq("id",condition.work_schedule_id).single()
   ]);
   if(!employment||!profile||!employer||!est||!position?.cbo_code||!union?.tax_id||!schedule?.description)throw new Error("Alteração contratual incompleta para S-2206.");const eType=employerType(employer.tax_id);
   const unsigned=buildS2206StandardClt({environment:env,employerType:eType,employerNumber:employer.tax_id,cpf:person.cpf,registrationNumber:employment.registration_number,changeDate:condition.valid_from,description:condition.change_reason,socialSecurityRegimeType:profile.social_security_regime_type as 1|3,workRegimeJourney:profile.work_regime_journey as 1|2|3|4,activityNature:profile.activity_nature as 1|2,unionBaseMonth:profile.union_base_month,unionTaxId:union.tax_id,positionName:position.name,cboCode:position.cbo_code,functionName:fn?.name??null,categoryCode:condition.esocial_category_code??"101",salary:Number(condition.base_salary),salaryUnit:profile.fixed_salary_unit as 1|2|3|4|5|6|7,contractType:profile.contract_type as 1|2|3,contractEndDate:profile.contract_end_date,determinedObject:profile.determined_object,establishmentType:establishmentType(est.registration_type),establishmentNumber:est.registration_number,weeklyHours:Number(schedule.weekly_hours),journeyType:profile.journey_type as 2|3|4|5|6|7|9,partialTimeType:profile.partial_time_type as 0|1|2|3,nightWork:profile.night_work as "S"|"N",journeyDescription:schedule.description});const signed=signEsocialXml(unsigned);
   eventId=await persist(context,{eventType,sourceType:"EMPLOYMENT_CONDITION",sourceId,environment:env,eventKey:signed.eventKey,employerType:eType,employerNumber:employer.tax_id,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});
  }else throw new Error("Evento de alteração não suportado.");
 }catch(error){fail(workerId,error instanceof Error?error.message:"Falha ao gerar alteração eSocial.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}
