import "server-only";

import https from "node:https";
import { createHash } from "node:crypto";
import { ESOCIAL_ENDPOINTS } from "./government";

export type EsocialEnvironment = "RESTRICTED" | "PRODUCTION";
export type EsocialRegistrationType = 1 | 2;

const SEND_ACTION = process.env.ESOCIAL_SEND_SOAP_ACTION
  ?? "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0/ServicoEnviarLoteEventos/EnviarLoteEventos";
const QUERY_ACTION = process.env.ESOCIAL_QUERY_SOAP_ACTION
  ?? "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0/ServicoConsultarLoteEventos/ConsultarLoteEventos";
const SERVICE_SEND_NS = "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0";
const SERVICE_QUERY_NS = "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0";
const DEFAULT_BATCH_NS_VERSION = process.env.ESOCIAL_BATCH_NAMESPACE_VERSION ?? "v1_1_1";
const DEFAULT_QUERY_NS_VERSION = process.env.ESOCIAL_QUERY_NAMESPACE_VERSION ?? "v1_0_0";

export function sha256(value:string|Buffer){return createHash("sha256").update(value).digest("hex");}

export function assertSignedEsocialEvent(xml:string){
  const normalized=xml.trim();
  if(!normalized.startsWith("<eSocial")&&!normalized.startsWith("<?xml"))throw new Error("O XML do evento deve possuir raiz eSocial.");
  if(!/<Signature\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2000\/09\/xmldsig#["']/i.test(normalized))throw new Error("O evento precisa estar assinado individualmente com XMLDSig antes do lote.");
  const id=normalized.match(/\bId=["'](ID[^"']+)["']/)?.[1];
  if(!id)throw new Error("Não foi encontrado atributo Id do evento eSocial.");
  return{id,payloadSha256:sha256(normalized),normalizedXml:normalized};
}

function escapeXml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}

export function buildEsocialBatchXml(input:{
  group:1|2|3;
  employerType:EsocialRegistrationType;
  employerNumber:string;
  transmitterType:EsocialRegistrationType;
  transmitterNumber:string;
  events:Array<{id:string;signedXml:string}>;
  namespaceVersion?:string;
}){
  if(input.events.length<1||input.events.length>50)throw new Error("O lote eSocial deve conter entre 1 e 50 eventos.");
  const namespaceVersion=input.namespaceVersion??DEFAULT_BATCH_NS_VERSION;
  const events=input.events.map(event=>{
    const parsed=assertSignedEsocialEvent(event.signedXml);
    if(parsed.id!==event.id)throw new Error(`A chave ${event.id} não coincide com o Id contido no XML assinado.`);
    return `<evento Id="${escapeXml(event.id)}">${parsed.normalizedXml}</evento>`;
  }).join("");
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/${escapeXml(namespaceVersion)}"><envioLoteEventos grupo="${input.group}"><ideEmpregador><tpInsc>${input.employerType}</tpInsc><nrInsc>${escapeXml(input.employerNumber)}</nrInsc></ideEmpregador><ideTransmissor><tpInsc>${input.transmitterType}</tpInsc><nrInsc>${escapeXml(input.transmitterNumber)}</nrInsc></ideTransmissor><eventos>${events}</eventos></envioLoteEventos></eSocial>`;
}

export function buildSendSoapEnvelope(batchXml:string){
  return `<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${SERVICE_SEND_NS}"><soapenv:Header/><soapenv:Body><v1:EnviarLoteEventos><v1:loteEventos>${batchXml}</v1:loteEventos></v1:EnviarLoteEventos></soapenv:Body></soapenv:Envelope>`;
}

export function buildQueryXml(protocol:string,namespaceVersion=DEFAULT_QUERY_NS_VERSION){
  if(!protocol.trim())throw new Error("Protocolo eSocial obrigatório para consulta.");
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/consulta/retornoProcessamento/${escapeXml(namespaceVersion)}"><consultaLoteEventos><protocoloEnvio>${escapeXml(protocol.trim())}</protocoloEnvio></consultaLoteEventos></eSocial>`;
}

export function buildQuerySoapEnvelope(protocol:string){
  const queryXml=buildQueryXml(protocol);
  return `<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${SERVICE_QUERY_NS}"><soapenv:Header/><soapenv:Body><v1:ConsultarLoteEventos><v1:consulta>${queryXml}</v1:consulta></v1:ConsultarLoteEventos></soapenv:Body></soapenv:Envelope>`;
}

function certificateOptions():Pick<https.RequestOptions,"cert"|"key"|"pfx"|"passphrase">{
  const pfxBase64=process.env.ESOCIAL_CERTIFICATE_PFX_BASE64?.trim();
  if(pfxBase64)return{pfx:Buffer.from(pfxBase64,"base64"),passphrase:process.env.ESOCIAL_CERTIFICATE_PASSPHRASE};
  const cert=process.env.ESOCIAL_CERTIFICATE_PEM?.replaceAll("\\n","\n");
  const key=process.env.ESOCIAL_PRIVATE_KEY_PEM?.replaceAll("\\n","\n");
  if(cert&&key)return{cert,key,passphrase:process.env.ESOCIAL_CERTIFICATE_PASSPHRASE};
  throw new Error("Certificado eSocial não configurado no ambiente seguro do servidor.");
}

function endpoint(environment:EsocialEnvironment,operation:"SEND"|"QUERY"){
  if(environment==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")throw new Error("Transmissão eSocial em produção está bloqueada. Homologue primeiro em Produção Restrita.");
  const selected=environment==="PRODUCTION"?ESOCIAL_ENDPOINTS.production:ESOCIAL_ENDPOINTS.restricted;
  return operation==="SEND"?selected.send:selected.query;
}

export type EsocialHttpResult={
  endpoint:string;soapAction:string;httpStatus:number;responseXml:string;durationMs:number;requestSha256:string;responseSha256:string;
};

async function postSoap(url:string,soapAction:string,body:string,timeoutMs=30_000):Promise<EsocialHttpResult>{
  const target=new URL(url);
  if(target.protocol!=="https:"||!target.hostname.endsWith(".esocial.gov.br"))throw new Error("Destino eSocial não pertence ao domínio oficial permitido.");
  const cert=certificateOptions();
  const started=Date.now();
  return await new Promise((resolve,reject)=>{
    const request=https.request({
      protocol:"https:",hostname:target.hostname,port:target.port?Number(target.port):443,path:`${target.pathname}${target.search}`,
      method:"POST",...cert,minVersion:"TLSv1.2",rejectUnauthorized:true,
      headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":`"${soapAction}"`,"Content-Length":Buffer.byteLength(body,"utf8"),"User-Agent":"Innovar-RH-eSocial/0.1"}
    },response=>{
      const chunks:Buffer[]=[];
      response.on("data",chunk=>chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)));
      response.on("end",()=>{
        const responseXml=Buffer.concat(chunks).toString("utf8");
        resolve({endpoint:url,soapAction,httpStatus:response.statusCode??0,responseXml,durationMs:Date.now()-started,requestSha256:sha256(body),responseSha256:sha256(responseXml)});
      });
    });
    request.setTimeout(timeoutMs,()=>request.destroy(new Error("Timeout na comunicação com o eSocial; o resultado deve ser tratado como indeterminado até consulta/reconciliação.")));
    request.on("error",reject);
    request.end(body,"utf8");
  });
}

export async function sendEsocialBatch(environment:EsocialEnvironment,batchXml:string){
  const body=buildSendSoapEnvelope(batchXml);
  return postSoap(endpoint(environment,"SEND"),SEND_ACTION,body);
}

export async function queryEsocialBatch(environment:EsocialEnvironment,protocol:string){
  const body=buildQuerySoapEnvelope(protocol);
  return postSoap(endpoint(environment,"QUERY"),QUERY_ACTION,body);
}

export function extractEsocialProtocol(xml:string){
  return xml.match(/<protocoloEnvio>([^<]+)<\/protocoloEnvio>/i)?.[1]?.trim()??null;
}

export function extractEsocialResponseStatus(xml:string){
  return{
    code:xml.match(/<cdResposta>([^<]+)<\/cdResposta>/i)?.[1]?.trim()??null,
    description:xml.match(/<descResposta>([^<]+)<\/descResposta>/i)?.[1]?.trim()??null,
    estimatedSeconds:Number(xml.match(/<tempoEstimadoConclusao>([^<]+)<\/tempoEstimadoConclusao>/i)?.[1]??"")||null
  };
}
