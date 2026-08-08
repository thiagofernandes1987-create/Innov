"use server";

import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{signEsocialXml}from"@/lib/rh/integrations/esocial-signature";
import{buildS1200,buildS1210,buildS1298,buildS1299,type S1200RubricLine}from"@/lib/rh/integrations/esocial-periodic-xml";
import{xmlSha256,type EsocialEnvironment}from"@/lib/rh/integrations/esocial-xml";

const BASE="/app/rh/folha";
function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function digits(v:string){return v.replace(/\D/g,"");}
function env(v:string):EsocialEnvironment{return v==="PRODUCTION"?"PRODUCTION":"RESTRICTED";}
function employerType(v:string):1|2{return digits(v).length===11?2:1;}
function estType(v:string):1|3|4{if(v==="CAEPF")return 3;if(v==="CNO")return 4;return 1;}
function fail(path:string,m:string):never{redirect(`${path}?error=${encodeURIComponent(m)}`);}
function transmitter(t:1|2,n:string){const raw=Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE??t);return{type:(raw===2?2:1)as 1|2,number:digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER??n)};}

type RhContext=Awaited<ReturnType<typeof requireCapability>>;

async function persist(context:RhContext,input:{eventType:string;sourceType:string;sourceId:string;eventGroup:number;environment:EsocialEnvironment;employerType:1|2;employerNumber:string;eventKey:string;unsignedXml:string;signedXml:string;signedSha256:string}){
 const tx=transmitter(input.employerType,input.employerNumber);if(!tx.number)throw new Error("Transmissor eSocial não configurado.");
 const{data,error}=await context.supabase.rpc("persist_rh_esocial_generated_event",{p_organization_id:context.organizationId,p_event_type:input.eventType,p_event_key:input.eventKey,p_event_group:input.eventGroup,p_environment:input.environment,p_operation:"INCLUDE",p_layout_version:"S-1.3",p_source_type:input.sourceType,p_source_id:input.sourceId,p_employer_registration_type:input.employerType,p_employer_registration_number:digits(input.employerNumber),p_transmitter_registration_type:tx.type,p_transmitter_registration_number:tx.number,p_unsigned_xml:input.unsignedXml,p_unsigned_sha256:xmlSha256(input.unsignedXml),p_signed_xml:input.signedXml,p_signed_sha256:input.signedSha256});
 if(error)throw new Error(error.message);return String(data);
}

async function periodContext(context:RhContext,periodId:string){
 const{data:period,error}=await context.supabase.from("rh_payroll_periods").select("id,reference_month,status,pay_date").eq("organization_id",context.organizationId).eq("id",periodId).maybeSingle();
 if(error||!period)throw new Error(error?.message??"Competência não encontrada.");
 const{data:run,error:rError}=await context.supabase.from("rh_payroll_runs").select("id,run_number,status").eq("organization_id",context.organizationId).eq("period_id",periodId).eq("status","COMPLETED").order("run_number",{ascending:false}).limit(1).maybeSingle();
 if(rError||!run)throw new Error(rError?.message??"Execução concluída não encontrada.");
 return{period,run,month:String(period.reference_month).slice(0,7)};
}

async function employerForEmployment(context:RhContext,employmentId:string,asOf:string){
 const{data:condition,error:cError}=await context.supabase.from("rh_employment_conditions").select("employer_id").eq("organization_id",context.organizationId).eq("employment_id",employmentId).lte("valid_from",asOf).order("valid_from",{ascending:false}).limit(1).maybeSingle();
 if(cError||!condition?.employer_id)throw new Error(cError?.message??"Condição vigente/empregador não encontrado.");
 const{data:employer,error:eError}=await context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",condition.employer_id).maybeSingle();
 if(eError||!employer?.tax_id)throw new Error(eError?.message??"Empregador sem inscrição fiscal.");
 return employer;
}

export async function createPayrollPaymentOrders(data:FormData){const context=await requireCapability("rh","update"),periodId=text(data,"periodId"),path=`${BASE}/competencias/${periodId}`;const{data:count,error}=await context.supabase.rpc("create_rh_payroll_payments",{p_period_id:periodId});if(error)fail(path,error.message);redirect(`${path}?success=${encodeURIComponent(`${count??0} ordem(ns) de pagamento criada(s).`)}`);}

export async function settlePayrollPayment(data:FormData){const context=await requireCapability("rh","approve"),paymentId=text(data,"paymentId"),periodId=text(data,"periodId"),path=`${BASE}/competencias/${periodId}`;const{error}=await context.supabase.rpc("settle_rh_payroll_payment",{p_payment_id:paymentId,p_paid_at:text(data,"paidAt"),p_bank_reference:text(data,"bankReference")||null,p_external_payment_id:text(data,"externalPaymentId")||null,p_evidence_reference:text(data,"evidenceReference")||null});if(error)fail(path,error.message);redirect(path);}

export async function generateS1200(data:FormData){
 const context=await requireCapability("rh","update"),workerResultId=text(data,"workerResultId"),periodId=text(data,"periodId"),environment=env(text(data,"environment")),path=`${BASE}/competencias/${periodId}`;
 if(environment==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")fail(path,"Produção bloqueada.");let eventId="";
 try{
  const{period,run,month}=await periodContext(context,periodId);if(period.status!=="CLOSED")throw new Error("S-1200 só pode ser gerado de competência fechada.");
  const{data:wr,error}=await context.supabase.from("rh_payroll_worker_results").select("id,employment_id").eq("organization_id",context.organizationId).eq("id",workerResultId).eq("run_id",run.id).maybeSingle();if(error||!wr)throw new Error(error?.message??"Resultado do trabalhador não encontrado.");
  const{data:employment,error:employmentError}=await context.supabase.from("rh_employments").select("worker_id,registration_number").eq("organization_id",context.organizationId).eq("id",wr.employment_id).maybeSingle();if(employmentError||!employment)throw new Error(employmentError?.message??"Vínculo não encontrado.");
  const{data:worker,error:workerError}=await context.supabase.from("rh_workers").select("person_id").eq("organization_id",context.organizationId).eq("id",employment.worker_id).maybeSingle();if(workerError||!worker)throw new Error(workerError?.message??"Trabalhador não encontrado.");
  const{data:person,error:personError}=await context.supabase.from("rh_people").select("cpf").eq("organization_id",context.organizationId).eq("id",worker.person_id).maybeSingle();if(personError||!person?.cpf)throw new Error(personError?.message??"CPF ausente.");
  const{data:condition,error:conditionError}=await context.supabase.from("rh_employment_conditions").select("employer_id,establishment_id,tax_allocation_id,esocial_category_code").eq("organization_id",context.organizationId).eq("employment_id",wr.employment_id).lte("valid_from",period.reference_month).order("valid_from",{ascending:false}).limit(1).maybeSingle();if(conditionError||!condition?.esocial_category_code||!condition.tax_allocation_id)throw new Error(conditionError?.message??"Condição vigente sem categoria/lotação eSocial.");
  const[{data:employer,error:empError},{data:est,error:estError},{data:lot,error:lotError},{data:rawLines,error:lError}]=await Promise.all([context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",condition.employer_id).maybeSingle(),context.supabase.from("rh_establishments").select("registration_type,registration_number").eq("organization_id",context.organizationId).eq("id",condition.establishment_id).maybeSingle(),context.supabase.from("rh_tax_allocations").select("esocial_lotacao_code").eq("organization_id",context.organizationId).eq("id",condition.tax_allocation_id).maybeSingle(),context.supabase.from("rh_payroll_result_lines").select("quantity,amount,rubric_version_id,rh_rubric_versions(esocial_table_code,rh_rubrics(code))").eq("organization_id",context.organizationId).eq("worker_result_id",workerResultId)]);
  if(empError||estError||lotError||lError)throw new Error(empError?.message??estError?.message??lotError?.message??lError?.message??"Falha ao carregar estrutura eSocial.");if(!employer||!est||!lot?.esocial_lotacao_code)throw new Error("Estrutura eSocial incompleta.");
  const lines:S1200RubricLine[]=(rawLines??[]).map(l=>{const rv=Array.isArray(l.rh_rubric_versions)?l.rh_rubric_versions[0]:l.rh_rubric_versions;const rub=rv?(Array.isArray(rv.rh_rubrics)?rv.rh_rubrics[0]:rv.rh_rubrics):null;if(!rv?.esocial_table_code||!rub?.code)throw new Error("Toda linha S-1200 exige rubrica com ideTabRubr.");return{rubricCode:rub.code,tableCode:rv.esocial_table_code,amount:Number(l.amount),quantity:l.quantity==null?null:Number(l.quantity)};});
  const eType=employerType(employer.tax_id);const unsigned=buildS1200({environment,employerType:eType,employerNumber:employer.tax_id,period:month,cpf:person.cpf,registrationNumber:employment.registration_number,categoryCode:condition.esocial_category_code,demonstrativeId:`FOL${run.run_number}${workerResultId.replace(/-/g,"").slice(0,16)}`,establishmentType:estType(est.registration_type),establishmentNumber:est.registration_number,lotacaoCode:lot.esocial_lotacao_code,lines});const signed=signEsocialXml(unsigned);eventId=await persist(context,{eventType:"S-1200",sourceType:"PAYROLL_WORKER_RESULT",sourceId:workerResultId,eventGroup:3,environment,employerType:eType,employerNumber:employer.tax_id,eventKey:signed.eventKey,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});
 }catch(error){fail(path,error instanceof Error?error.message:"Falha ao gerar S-1200.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}

export async function generateS1210(data:FormData){
 const context=await requireCapability("rh","update"),paymentId=text(data,"paymentId"),periodId=text(data,"periodId"),environment=env(text(data,"environment")),path=`${BASE}/competencias/${periodId}`;let eventId="";
 try{
  const{period,run,month}=await periodContext(context,periodId);const{data:p,error}=await context.supabase.from("rh_payroll_payments").select("id,worker_result_id,employment_id,amount,paid_at,status").eq("organization_id",context.organizationId).eq("id",paymentId).eq("run_id",run.id).maybeSingle();if(error||!p)throw new Error(error?.message??"Pagamento não encontrado.");if(p.status!=="SETTLED"||!p.paid_at)throw new Error("S-1210 só pode ser gerado de pagamento liquidado.");
  const{data:s1200}=await context.supabase.from("rh_esocial_events").select("id").eq("organization_id",context.organizationId).eq("event_type","S-1200").eq("source_id",p.worker_result_id).eq("status","ACCEPTED").limit(1).maybeSingle();if(!s1200)throw new Error("S-1210 exige S-1200 correspondente ACCEPTED.");
  const{data:employment,error:employmentError}=await context.supabase.from("rh_employments").select("worker_id").eq("organization_id",context.organizationId).eq("id",p.employment_id).maybeSingle();if(employmentError||!employment)throw new Error(employmentError?.message??"Vínculo não encontrado.");
  const{data:worker,error:workerError}=await context.supabase.from("rh_workers").select("person_id").eq("organization_id",context.organizationId).eq("id",employment.worker_id).maybeSingle();if(workerError||!worker)throw new Error(workerError?.message??"Trabalhador não encontrado.");
  const{data:person,error:personError}=await context.supabase.from("rh_people").select("cpf").eq("organization_id",context.organizationId).eq("id",worker.person_id).maybeSingle();if(personError||!person?.cpf)throw new Error(personError?.message??"CPF ausente.");
  const employer=await employerForEmployment(context,p.employment_id,period.reference_month);const eType=employerType(employer.tax_id);const unsigned=buildS1210({environment,employerType:eType,employerNumber:employer.tax_id,period:month,cpf:person.cpf,paymentDate:String(p.paid_at).slice(0,10),paymentType:1,referencePeriod:month,demonstrativeId:`FOL${run.run_number}${p.worker_result_id.replace(/-/g,"").slice(0,16)}`,netAmount:Number(p.amount)});const signed=signEsocialXml(unsigned);eventId=await persist(context,{eventType:"S-1210",sourceType:"PAYROLL_PAYMENT",sourceId:p.id,eventGroup:3,environment,employerType:eType,employerNumber:employer.tax_id,eventKey:signed.eventKey,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});
 }catch(error){fail(path,error instanceof Error?error.message:"Falha ao gerar S-1210.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}

export async function generateS1299(data:FormData){
 const context=await requireCapability("rh","approve"),periodId=text(data,"periodId"),environment=env(text(data,"environment")),path=`${BASE}/competencias/${periodId}`;let eventId="";
 try{
  const{period,run,month}=await periodContext(context,periodId);const{data:workerRows,count:workers,error:workersError}=await context.supabase.from("rh_payroll_worker_results").select("id,employment_id",{count:"exact"}).eq("organization_id",context.organizationId).eq("run_id",run.id);if(workersError)throw new Error(workersError.message);if(!workerRows?.length)throw new Error("S-1299 exige ao menos um resultado de trabalhador para identificar o empregador desta competência.");
  const sourceIds=workerRows.map(x=>x.id);const{count:acceptedRemun}=await context.supabase.from("rh_esocial_events").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("event_type","S-1200").eq("status","ACCEPTED").in("source_id",sourceIds);if((workers??0)!==(acceptedRemun??0))throw new Error(`Fechamento exige todos S-1200 aceitos (${acceptedRemun??0}/${workers??0}).`);
  const{data:payments,error:paymentsError}=await context.supabase.from("rh_payroll_payments").select("id,status").eq("organization_id",context.organizationId).eq("run_id",run.id);if(paymentsError)throw new Error(paymentsError.message);if((payments??[]).some(p=>p.status!=="SETTLED"))throw new Error("Fechamento exige todos pagamentos liquidados.");
  const paymentIds=(payments??[]).map(p=>p.id);if(paymentIds.length){const{count:acceptedPgt}=await context.supabase.from("rh_esocial_events").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("event_type","S-1210").eq("status","ACCEPTED").in("source_id",paymentIds);if((acceptedPgt??0)!==paymentIds.length)throw new Error(`Fechamento exige todos S-1210 aceitos (${acceptedPgt??0}/${paymentIds.length}).`);}
  const employer=await employerForEmployment(context,workerRows[0].employment_id,period.reference_month);const eType=employerType(employer.tax_id);const unsigned=buildS1299({environment,employerType:eType,employerNumber:employer.tax_id,period:month,hasRemuneration:(workers??0)>0,hasPayments:paymentIds.length>0,hasProduction:false,hasNonPayrollContracting:false,hasAdditionalPeriodInfo:false});const signed=signEsocialXml(unsigned);eventId=await persist(context,{eventType:"S-1299",sourceType:"PAYROLL_PERIOD_CLOSE",sourceId:periodId,eventGroup:3,environment,employerType:eType,employerNumber:employer.tax_id,eventKey:signed.eventKey,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});await context.supabase.from("rh_esocial_period_states").upsert({organization_id:context.organizationId,period_id:periodId,reference_month:period.reference_month,status:"CLOSURE_SENT",closure_event_id:eventId,created_by:context.userId,updated_at:new Date().toISOString()},{onConflict:"period_id"});
 }catch(error){fail(path,error instanceof Error?error.message:"Falha ao gerar S-1299.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}

export async function generateS1298(data:FormData){
 const context=await requireCapability("rh","approve"),periodId=text(data,"periodId"),environment=env(text(data,"environment")),path=`${BASE}/competencias/${periodId}`;let eventId="";
 try{
  const{period,run,month}=await periodContext(context,periodId);const{data:close}=await context.supabase.from("rh_esocial_events").select("id").eq("organization_id",context.organizationId).eq("event_type","S-1299").eq("source_id",periodId).eq("status","ACCEPTED").limit(1).maybeSingle();if(!close)throw new Error("S-1298 exige S-1299 ACCEPTED para a competência.");
  const{data:firstWr,error:firstError}=await context.supabase.from("rh_payroll_worker_results").select("employment_id").eq("organization_id",context.organizationId).eq("run_id",run.id).limit(1).maybeSingle();if(firstError||!firstWr)throw new Error(firstError?.message??"Não foi possível identificar o empregador da competência.");
  const employer=await employerForEmployment(context,firstWr.employment_id,period.reference_month);const eType=employerType(employer.tax_id);const unsigned=buildS1298({environment,employerType:eType,employerNumber:employer.tax_id,period:month});const signed=signEsocialXml(unsigned);eventId=await persist(context,{eventType:"S-1298",sourceType:"PAYROLL_PERIOD_REOPEN",sourceId:periodId,eventGroup:3,environment,employerType:eType,employerNumber:employer.tax_id,eventKey:signed.eventKey,unsignedXml:unsigned,signedXml:signed.signedXml,signedSha256:signed.payloadSha256});await context.supabase.from("rh_esocial_period_states").upsert({organization_id:context.organizationId,period_id:periodId,reference_month:period.reference_month,status:"REOPEN_SENT",reopen_event_id:eventId,created_by:context.userId,updated_at:new Date().toISOString()},{onConflict:"period_id"});
 }catch(error){fail(path,error instanceof Error?error.message:"Falha ao gerar S-1298.");}
 redirect(`/app/rh/obrigacoes/esocial/eventos/${eventId}`);
}
