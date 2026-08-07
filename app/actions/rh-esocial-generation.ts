"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { signEsocialXml } from "@/lib/rh/integrations/esocial-signature";
import { buildS1000,buildS1005,buildS1010,buildS1020,makeEsocialEventId,xmlSha256,type EsocialEnvironment,type EsocialOperation } from "@/lib/rh/integrations/esocial-xml";

const BASE="/app/rh/obrigacoes/esocial";
function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function fail(path:string,message:string):never{redirect(`${path}?error=${encodeURIComponent(message)}`);}
function environment(value:string):EsocialEnvironment{return value==="PRODUCTION"?"PRODUCTION":"RESTRICTED";}
function operation(value:string):EsocialOperation{return value==="RECTIFY"?"RECTIFY":value==="DELETE"?"DELETE":"INCLUDE";}
function digits(value:string){return value.replace(/\D/g,"");}
function employerType(taxId:string):1|2{return digits(taxId).length===11?2:1;}
function establishmentType(value:string):1|3|4{if(value==="CAEPF")return 3;if(value==="CNO")return 4;return 1;}
function exclusiveEnd(value:string|null|undefined){if(!value)return null;const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
function transmitter(fallbackType:1|2,fallbackNumber:string){
  const rawType=Number(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_TYPE??fallbackType);
  const type:1|2=rawType===2?2:1;
  const number=digits(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER??fallbackNumber);
  if(!number)throw new Error("Identificação do transmissor eSocial não configurada.");
  return{type,number};
}

async function persist(input:{
  organizationId:string;eventType:string;eventKey:string;eventGroup:number;environment:EsocialEnvironment;operation:EsocialOperation;
  sourceType:string;sourceId:string;employerType:1|2;employerNumber:string;transmitterType:1|2;transmitterNumber:string;unsignedXml:string;signedXml:string;signedSha256:string;
},supabase:Awaited<ReturnType<typeof requireCapability>>["supabase"]){
  const{data,error}=await supabase.rpc("persist_rh_esocial_generated_event",{
    p_organization_id:input.organizationId,p_event_type:input.eventType,p_event_key:input.eventKey,p_event_group:input.eventGroup,
    p_environment:input.environment,p_operation:input.operation,p_layout_version:"S-1.3",p_source_type:input.sourceType,p_source_id:input.sourceId,
    p_employer_registration_type:input.employerType,p_employer_registration_number:digits(input.employerNumber),
    p_transmitter_registration_type:input.transmitterType,p_transmitter_registration_number:digits(input.transmitterNumber),
    p_unsigned_xml:input.unsignedXml,p_unsigned_sha256:xmlSha256(input.unsignedXml),p_signed_xml:input.signedXml,p_signed_sha256:input.signedSha256
  });
  if(error)throw new Error(error.message);
  return String(data);
}

export async function generateSignedEsocialTableEvent(data:FormData){
  const context=await requireCapability("rh","update");
  const eventType=text(data,"eventType").toUpperCase();
  const sourceId=text(data,"sourceId");
  const employerId=text(data,"employerId");
  const env=environment(text(data,"environment"));
  const op=operation(text(data,"operation"));
  const path=`${BASE}/novo`;
  if(!sourceId)fail(path,"Fonte do evento obrigatória.");
  if(env==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")fail(path,"Produção permanece bloqueada até homologação formal em Produção Restrita.");

  let unsignedXml="";let sourceType="";let employerTaxId="";let persistedEventId="";
  try{
    if(eventType==="S-1000"){
      const{data:profile,error}=await context.supabase.from("rh_esocial_employer_profiles").select("id,employer_id,valid_from,valid_to,class_trib,ind_coop,ind_constr,ind_des_folha,ind_opt_reg_eletron,ind_ent_ed,ind_ett").eq("organization_id",context.organizationId).eq("id",sourceId).maybeSingle();
      if(error||!profile)throw new Error(error?.message??"Perfil eSocial do empregador não encontrado.");
      const{data:employer,error:eError}=await context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",profile.employer_id).maybeSingle();
      if(eError||!employer)throw new Error(eError?.message??"Empregador não encontrado.");
      employerTaxId=employer.tax_id;const eType=employerType(employerTaxId);const eventKey=makeEsocialEventId(eType,employerTaxId);
      unsignedXml=buildS1000({eventKey,environment:env,operation:op,employerType:eType,employerNumber:employerTaxId,validFrom:profile.valid_from,validTo:exclusiveEnd(profile.valid_to),classTrib:profile.class_trib,indCoop:profile.ind_coop,indConstr:profile.ind_constr,indDesFolha:profile.ind_des_folha,indOptRegEletron:profile.ind_opt_reg_eletron,indEntEd:profile.ind_ent_ed,indEtt:profile.ind_ett});
      sourceType="ESOCIAL_EMPLOYER_PROFILE";
    }else if(eventType==="S-1005"){
      const{data:profile,error}=await context.supabase.from("rh_esocial_establishment_profiles").select("id,establishment_id,valid_from,valid_to,cnae_preponderant,rat_rate,fap").eq("organization_id",context.organizationId).eq("id",sourceId).maybeSingle();
      if(error||!profile)throw new Error(error?.message??"Perfil eSocial do estabelecimento não encontrado.");
      const{data:est,error:sError}=await context.supabase.from("rh_establishments").select("employer_id,registration_type,registration_number").eq("organization_id",context.organizationId).eq("id",profile.establishment_id).maybeSingle();
      if(sError||!est)throw new Error(sError?.message??"Estabelecimento não encontrado.");
      const{data:employer,error:eError}=await context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",est.employer_id).maybeSingle();
      if(eError||!employer)throw new Error(eError?.message??"Empregador não encontrado.");
      employerTaxId=employer.tax_id;const eType=employerType(employerTaxId);const eventKey=makeEsocialEventId(eType,employerTaxId);
      unsignedXml=buildS1005({eventKey,environment:env,operation:op,employerType:eType,employerNumber:employerTaxId,establishmentType:establishmentType(est.registration_type),establishmentNumber:est.registration_number,validFrom:profile.valid_from,validTo:exclusiveEnd(profile.valid_to),cnaePreponderant:profile.cnae_preponderant,ratRate:profile.rat_rate,fap:profile.fap});
      sourceType="ESOCIAL_ESTABLISHMENT_PROFILE";
    }else if(eventType==="S-1010"){
      if(!employerId)throw new Error("S-1010 exige empregador de destino.");
      const[{data:version,error:vError},{data:employer,error:eError}]=await Promise.all([
        context.supabase.from("rh_rubric_versions").select("id,rubric_id,valid_from,valid_to,esocial_nature_code,cod_inc_cp,cod_inc_irrf,cod_inc_fgts,esocial_table_code,esocial_rubric_type").eq("organization_id",context.organizationId).eq("id",sourceId).maybeSingle(),
        context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",employerId).maybeSingle()
      ]);
      if(vError||!version)throw new Error(vError?.message??"Versão da rubrica não encontrada.");if(eError||!employer)throw new Error(eError?.message??"Empregador não encontrado.");
      const{data:rubric,error:rError}=await context.supabase.from("rh_rubrics").select("code,name").eq("organization_id",context.organizationId).eq("id",version.rubric_id).maybeSingle();
      if(rError||!rubric)throw new Error(rError?.message??"Rubrica não encontrada.");
      if(!version.esocial_nature_code||!version.cod_inc_cp||!version.cod_inc_irrf||!version.cod_inc_fgts||!version.esocial_table_code||!version.esocial_rubric_type)throw new Error("Rubrica sem parametrização eSocial completa para S-1010.");
      employerTaxId=employer.tax_id;const eType=employerType(employerTaxId);const eventKey=makeEsocialEventId(eType,employerTaxId);
      unsignedXml=buildS1010({eventKey,environment:env,operation:op,employerType:eType,employerNumber:employerTaxId,rubricCode:rubric.code,tableCode:version.esocial_table_code,validFrom:version.valid_from,validTo:exclusiveEnd(version.valid_to),description:rubric.name,natureCode:version.esocial_nature_code,rubricType:version.esocial_rubric_type,codIncCP:version.cod_inc_cp,codIncIRRF:version.cod_inc_irrf,codIncFGTS:version.cod_inc_fgts});
      sourceType="RUBRIC_VERSION";
    }else if(eventType==="S-1020"){
      const{data:profile,error}=await context.supabase.from("rh_esocial_tax_allocation_profiles").select("id,tax_allocation_id,valid_from,valid_to,lotacao_type,fpas_code,third_parties_code").eq("organization_id",context.organizationId).eq("id",sourceId).maybeSingle();
      if(error||!profile)throw new Error(error?.message??"Perfil eSocial da lotação não encontrado.");
      const{data:allocation,error:aError}=await context.supabase.from("rh_tax_allocations").select("employer_id,esocial_lotacao_code").eq("organization_id",context.organizationId).eq("id",profile.tax_allocation_id).maybeSingle();
      if(aError||!allocation)throw new Error(aError?.message??"Lotação tributária não encontrada.");
      if(!allocation.esocial_lotacao_code)throw new Error("Lotação sem código eSocial.");
      const{data:employer,error:eError}=await context.supabase.from("rh_employers").select("tax_id").eq("organization_id",context.organizationId).eq("id",allocation.employer_id).maybeSingle();
      if(eError||!employer)throw new Error(eError?.message??"Empregador não encontrado.");
      employerTaxId=employer.tax_id;const eType=employerType(employerTaxId);const eventKey=makeEsocialEventId(eType,employerTaxId);
      unsignedXml=buildS1020({eventKey,environment:env,operation:op,employerType:eType,employerNumber:employerTaxId,lotacaoCode:allocation.esocial_lotacao_code,validFrom:profile.valid_from,validTo:exclusiveEnd(profile.valid_to),lotacaoType:profile.lotacao_type,fpasCode:profile.fpas_code,thirdPartiesCode:profile.third_parties_code});
      sourceType="ESOCIAL_TAX_ALLOCATION_PROFILE";
    }else throw new Error("Gerador disponível nesta etapa apenas para S-1000/S-1005/S-1010/S-1020.");

    const signed=signEsocialXml(unsignedXml);
    const eType=employerType(employerTaxId);const tx=transmitter(eType,employerTaxId);
    persistedEventId=await persist({organizationId:context.organizationId,eventType,eventKey:signed.eventKey,eventGroup:1,environment:env,operation:op,sourceType,sourceId,employerType:eType,employerNumber:employerTaxId,transmitterType:tx.type,transmitterNumber:tx.number,unsignedXml,signedXml:signed.signedXml,signedSha256:signed.payloadSha256},context.supabase);
  }catch(error){fail(path,error instanceof Error?error.message:"Falha ao gerar evento eSocial.");}
  if(!persistedEventId)fail(path,"Evento eSocial não foi persistido.");
  redirect(`${BASE}/eventos/${persistedEventId}`);
}
