"use server";

import{mensagemDeFalha}from"@/lib/errors/data-access";

import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{getConfiguredIntegraContadorServices,getIntegraContadorToken}from"@/lib/rh/integrations/integra-contador";

const PATH="/app/rh/obrigacoes/dctfweb";
export async function testIntegraContadorCredentials(){await requireCapability("rh","configure");try{const token=await getIntegraContadorToken("VALIDATION"),services=getConfiguredIntegraContadorServices();const details=`Token SERPRO obtido. Expiração informada: ${token.expiresIn||"não informada"}s. Serviços DCTFWeb configurados: ${Number(Boolean(services.dctfwebEventsPath))+Number(Boolean(services.dctfwebServicePath))}/2.`;redirect(`${PATH}?success=${encodeURIComponent(details)}`);}catch(error){const message=error instanceof Error?mensagemDeFalha("rh-integracontador.testIntegraContadorCredentials", error):"Falha ao validar Integra Contador.";redirect(`${PATH}?error=${encodeURIComponent(message)}`);}}
