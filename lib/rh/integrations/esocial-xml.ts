import { createHash } from "node:crypto";

export type EsocialEnvironment="RESTRICTED"|"PRODUCTION";
export type EsocialOperation="INCLUDE"|"RECTIFY"|"DELETE";

const VER_PROC=process.env.ESOCIAL_PROCESS_VERSION?.trim()||"Innovar-RH/0.1";
const LAYOUT="v_S_01_03_00";

function x(value:unknown){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}
function tag(name:string,value:unknown){return `<${name}>${x(value)}</${name}>`;}
function opt(name:string,value:unknown){return value===null||value===undefined||value===""?"":tag(name,value);}
function digits(value:string){return value.replace(/\D/g,"");}
function ym(value:string|Date){const date=value instanceof Date?value:new Date(`${value}T00:00:00Z`);return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;}
function tpAmb(environment:EsocialEnvironment){return environment==="PRODUCTION"?1:2;}
function operationName(operation:EsocialOperation){return operation==="INCLUDE"?"inclusao":operation==="DELETE"?"exclusao":"alteracao";}
function ideEvento(environment:EsocialEnvironment){return `<ideEvento>${tag("tpAmb",tpAmb(environment))}${tag("procEmi",1)}${tag("verProc",VER_PROC)}</ideEvento>`;}
function ideEmpregador(type:1|2,number:string){return `<ideEmpregador>${tag("tpInsc",type)}${tag("nrInsc",normalizeEmployerRegistrationNumber(type,number))}</ideEmpregador>`;}
function root(namespace:string,eventTag:string,eventKey:string,body:string){return `<eSocial xmlns="${namespace}"><${eventTag} Id="${x(eventKey)}" xmlns="${namespace}">${body}</${eventTag}></eSocial>`;}
function period(validFrom:string|Date,validTo?:string|Date|null){return `<idePeriodo>${tag("iniValid",ym(validFrom))}${validTo?tag("fimValid",ym(validTo)):""}</idePeriodo>`;}
function tableBlock(parent:string,operation:EsocialOperation,identity:string,data:string,newValidity?:{from:string|Date;to?:string|Date|null}){
  const op=operationName(operation);
  if(operation==="DELETE")return `<${parent}><${op}>${identity}</${op}></${parent}>`;
  const nova=operation==="RECTIFY"&&newValidity?`<novaValidade>${tag("iniValid",ym(newValidity.from))}${newValidity.to?tag("fimValid",ym(newValidity.to)):""}</novaValidade>`:"";
  return `<${parent}><${op}>${identity}${data}${nova}</${op}></${parent}>`;
}

export function normalizeEmployerRegistrationNumber(type:1|2,value:string){
  const normalized=digits(value);
  if(type===1&&normalized.length===14)return normalized.slice(0,8);
  return normalized;
}

export function makeEsocialEventId(registrationType:1|2,registrationNumber:string,at=new Date(),sequence=1){
  const reg=digits(registrationNumber).padStart(14,"0").slice(-14);
  const stamp=`${at.getUTCFullYear()}${String(at.getUTCMonth()+1).padStart(2,"0")}${String(at.getUTCDate()).padStart(2,"0")}${String(at.getUTCHours()).padStart(2,"0")}${String(at.getUTCMinutes()).padStart(2,"0")}${String(at.getUTCSeconds()).padStart(2,"0")}`;
  const seq=String(sequence).padStart(5,"0").slice(-5);
  return `ID${registrationType}${reg}${stamp}${seq}`;
}

export function xmlSha256(xml:string){return createHash("sha256").update(xml).digest("hex");}

export type S1000Input={
  eventKey:string;environment:EsocialEnvironment;operation:EsocialOperation;employerType:1|2;employerNumber:string;
  validFrom:string|Date;validTo?:string|Date|null;classTrib:string;indCoop:number;indConstr:number;indDesFolha:number;
  indOptRegEletron:number;indEntEd?:number;indEtt?:number;indTribFolhaPisPasep?:number|null;indPertIRRF?:number|null;newValidity?:{from:string|Date;to?:string|Date|null};
};
export function buildS1000(input:S1000Input){
  const ns=`http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/${LAYOUT}`;
  const identity=period(input.validFrom,input.validTo);
  // indEntEd/indEtt existiam em versões anteriores, mas não pertencem ao infoCadastro S-1.3 vigente.
  const data=`<infoCadastro>${tag("classTrib",input.classTrib)}${tag("indCoop",input.indCoop)}${tag("indConstr",input.indConstr)}${tag("indDesFolha",input.indDesFolha)}${tag("indOptRegEletron",input.indOptRegEletron)}${opt("indTribFolhaPisPasep",input.indTribFolhaPisPasep)}${opt("indPertIRRF",input.indPertIRRF)}</infoCadastro>`;
  return root(ns,"evtInfoEmpregador",input.eventKey,`${ideEvento(input.environment)}${ideEmpregador(input.employerType,input.employerNumber)}${tableBlock("infoEmpregador",input.operation,identity,data,input.newValidity)}`);
}

export type S1005Input={
  eventKey:string;environment:EsocialEnvironment;operation:EsocialOperation;employerType:1|2;employerNumber:string;
  establishmentType:1|3|4;establishmentNumber:string;validFrom:string|Date;validTo?:string|Date|null;
  cnaePreponderant:string;ratRate?:number|null;fap?:number|null;newValidity?:{from:string|Date;to?:string|Date|null};
};
export function buildS1005(input:S1005Input){
  const ns=`http://www.esocial.gov.br/schema/evt/evtTabEstab/${LAYOUT}`;
  const identity=`<ideEstab>${tag("tpInsc",input.establishmentType)}${tag("nrInsc",digits(input.establishmentNumber))}${tag("iniValid",ym(input.validFrom))}${input.validTo?tag("fimValid",ym(input.validTo)):""}</ideEstab>`;
  const data=`<dadosEstab>${tag("cnaePrep",digits(input.cnaePreponderant))}<aliqGilrat>${opt("aliqRat",input.ratRate)}${opt("fap",input.fap)}</aliqGilrat></dadosEstab>`;
  return root(ns,"evtTabEstab",input.eventKey,`${ideEvento(input.environment)}${ideEmpregador(input.employerType,input.employerNumber)}${tableBlock("infoEstab",input.operation,identity,data,input.newValidity)}`);
}

export type S1010Input={
  eventKey:string;environment:EsocialEnvironment;operation:EsocialOperation;employerType:1|2;employerNumber:string;
  rubricCode:string;tableCode:string;validFrom:string|Date;validTo?:string|Date|null;description:string;natureCode:string;
  rubricType:"1"|"2"|"3"|"4";codIncCP:string;codIncIRRF:string;codIncFGTS:string;newValidity?:{from:string|Date;to?:string|Date|null};
};
export function buildS1010(input:S1010Input){
  const ns=`http://www.esocial.gov.br/schema/evt/evtTabRubrica/${LAYOUT}`;
  const identity=`<ideRubrica>${tag("codRubr",input.rubricCode)}${tag("ideTabRubr",input.tableCode)}${tag("iniValid",ym(input.validFrom))}${input.validTo?tag("fimValid",ym(input.validTo)):""}</ideRubrica>`;
  const data=`<dadosRubrica>${tag("dscRubr",input.description)}${tag("natRubr",input.natureCode)}${tag("tpRubr",input.rubricType)}${tag("codIncCP",input.codIncCP)}${tag("codIncIRRF",input.codIncIRRF)}${tag("codIncFGTS",input.codIncFGTS)}</dadosRubrica>`;
  return root(ns,"evtTabRubrica",input.eventKey,`${ideEvento(input.environment)}${ideEmpregador(input.employerType,input.employerNumber)}${tableBlock("infoRubrica",input.operation,identity,data,input.newValidity)}`);
}

export type S1020Input={
  eventKey:string;environment:EsocialEnvironment;operation:EsocialOperation;employerType:1|2;employerNumber:string;
  lotacaoCode:string;validFrom:string|Date;validTo?:string|Date|null;lotacaoType:string;fpasCode:string;thirdPartiesCode?:string|null;
  newValidity?:{from:string|Date;to?:string|Date|null};
};
export function buildS1020(input:S1020Input){
  const ns=`http://www.esocial.gov.br/schema/evt/evtTabLotacao/${LAYOUT}`;
  const identity=`<ideLotacao>${tag("codLotacao",input.lotacaoCode)}${tag("iniValid",ym(input.validFrom))}${input.validTo?tag("fimValid",ym(input.validTo)):""}</ideLotacao>`;
  const data=`<dadosLotacao>${tag("tpLotacao",input.lotacaoType)}${tag("fpas",input.fpasCode)}${opt("codTercs",input.thirdPartiesCode)}</dadosLotacao>`;
  return root(ns,"evtTabLotacao",input.eventKey,`${ideEvento(input.environment)}${ideEmpregador(input.employerType,input.employerNumber)}${tableBlock("infoLotacao",input.operation,identity,data,input.newValidity)}`);
}
