import { makeEsocialEventId,normalizeEmployerRegistrationNumber,type EsocialEnvironment } from "./esocial-xml";

const LAYOUT="v_S_01_03_00";
const VER_PROC=process.env.ESOCIAL_PROCESS_VERSION?.trim()||"Innovar-RH/0.1";
function x(v:unknown){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}
function tag(n:string,v:unknown){return `<${n}>${x(v)}</${n}>`;}
function opt(n:string,v:unknown){return v===null||v===undefined||v===""?"":tag(n,v);}
function digits(v:string){return v.replace(/\D/g,"");}
function tpAmb(e:EsocialEnvironment){return e==="PRODUCTION"?1:2;}
function ideEvento(e:EsocialEnvironment,receipt?:string|null){return `<ideEvento>${tag("indRetif",receipt?2:1)}${receipt?tag("nrRecibo",receipt):""}${tag("tpAmb",tpAmb(e))}${tag("procEmi",1)}${tag("verProc",VER_PROC)}</ideEvento>`;}
function ideEmpregador(t:1|2,n:string){return `<ideEmpregador>${tag("tpInsc",t)}${tag("nrInsc",normalizeEmployerRegistrationNumber(t,n))}</ideEmpregador>`;}
function root(ns:string,eventTag:string,eventKey:string,body:string){return `<eSocial xmlns="${ns}"><${eventTag} Id="${x(eventKey)}">${body}</${eventTag}></eSocial>`;}

export type S2205Input={
 environment:EsocialEnvironment;employerType:1|2;employerNumber:string;cpf:string;changeDate:string;fullName:string;socialName?:string|null;sex:"M"|"F";
 raceColor:1|2|3|4|5;maritalStatus?:1|2|3|4|5|null;educationLevel:string;nationalityCountryCode:string;
 address:{streetType?:string|null;street:string;number:string;complement?:string|null;neighborhood?:string|null;postalCode:string;cityIbgeCode:string;state:string};
 phone?:string|null;email?:string|null;receipt?:string|null;eventKey?:string;
};
export function buildS2205Brazil(input:S2205Input){
 const eventKey=input.eventKey??makeEsocialEventId(input.employerType,input.employerNumber);
 if(!/^\d{11}$/.test(digits(input.cpf)))throw new Error("S-2205 exige CPF com 11 dígitos.");
 if(!/^\d{3}$/.test(input.nationalityCountryCode))throw new Error("S-2205 exige código de nacionalidade com 3 dígitos.");
 if(!/^\d{8}$/.test(digits(input.address.postalCode))||!/^\d{7}$/.test(digits(input.address.cityIbgeCode)))throw new Error("S-2205 exige CEP e município IBGE válidos em formato.");
 const address=`<endereco><brasil>${opt("tpLograd",input.address.streetType)}${tag("dscLograd",input.address.street)}${tag("nrLograd",input.address.number)}${opt("complemento",input.address.complement)}${opt("bairro",input.address.neighborhood)}${tag("cep",digits(input.address.postalCode))}${tag("codMunic",digits(input.address.cityIbgeCode))}${tag("uf",input.address.state)}</brasil></endereco>`;
 const contato=input.phone||input.email?`<contato>${opt("fonePrinc",input.phone?digits(input.phone):null)}${opt("emailPrinc",input.email)}</contato>`:"";
 const dados=`<dadosTrabalhador>${tag("nmTrab",input.fullName)}${tag("sexo",input.sex)}${tag("racaCor",input.raceColor)}${opt("estCiv",input.maritalStatus)}${tag("grauInstr",input.educationLevel)}${opt("nmSoc",input.socialName)}${tag("paisNac",input.nationalityCountryCode)}${address}${contato}</dadosTrabalhador>`;
 return root(`http://www.esocial.gov.br/schema/evt/evtAltCadastral/${LAYOUT}`,"evtAltCadastral",eventKey,`${ideEvento(input.environment,input.receipt)}${ideEmpregador(input.employerType,input.employerNumber)}<ideTrabalhador>${tag("cpfTrab",digits(input.cpf))}</ideTrabalhador><alteracao>${tag("dtAlteracao",input.changeDate)}${dados}</alteracao>`);
}

export type S2206Input={
 environment:EsocialEnvironment;employerType:1|2;employerNumber:string;cpf:string;registrationNumber:string;changeDate:string;effectDate?:string|null;description?:string|null;
 socialSecurityRegimeType:1|3;workRegimeJourney:1|2|3|4;activityNature:1|2;unionBaseMonth?:number|null;unionTaxId:string;
 positionName:string;cboCode:string;functionName?:string|null;functionCbo?:string|null;categoryCode:string;salary:number;salaryUnit:1|2|3|4|5|6|7;
 contractType:1|2|3;contractEndDate?:string|null;determinedObject?:string|null;establishmentType:1|3|4;establishmentNumber:string;weeklyHours:number;
 journeyType:2|3|4|5|6|7|9;partialTimeType:0|1|2|3;nightWork:"S"|"N";journeyDescription:string;receipt?:string|null;eventKey?:string;
};
export function buildS2206StandardClt(input:S2206Input){
 const eventKey=input.eventKey??makeEsocialEventId(input.employerType,input.employerNumber);
 if(!/^\d{11}$/.test(digits(input.cpf)))throw new Error("S-2206 exige CPF com 11 dígitos.");
 if(!/^\d{6}$/.test(digits(input.cboCode)))throw new Error("S-2206 exige CBO do cargo com 6 dígitos.");
 if(input.functionName&&(!input.functionCbo||!/^\d{6}$/.test(digits(input.functionCbo))))throw new Error("Função informada exige CBO da função com 6 dígitos.");
 if(!/^\d{14}$/.test(digits(input.unionTaxId)))throw new Error("S-2206 CLT exige CNPJ sindical com 14 dígitos.");
 if(["103","104","106"].includes(input.categoryCode))throw new Error("Categoria exige grupo específico ainda não suportado no S-2206 padrão.");
 if(input.contractType===2&&!input.contractEndDate)throw new Error("Contrato determinado exige dtTerm.");
 if(input.contractType===3&&!input.determinedObject)throw new Error("Contrato por fato exige objDet.");
 const celetista=`<infoRegimeTrab><infoCeletista>${tag("tpRegJor",input.workRegimeJourney)}${tag("natAtividade",input.activityNature)}${opt("dtBase",input.unionBaseMonth)}${tag("cnpjSindCategProf",digits(input.unionTaxId))}</infoCeletista></infoRegimeTrab>`;
 const remuneracao=`<remuneracao>${tag("vrSalFx",Number(input.salary).toFixed(2))}${tag("undSalFixo",input.salaryUnit)}</remuneracao>`;
 const duracao=`<duracao>${tag("tpContr",input.contractType)}${input.contractEndDate?tag("dtTerm",input.contractEndDate):""}${input.determinedObject?tag("objDet",input.determinedObject):""}</duracao>`;
 const local=`<localTrabalho><localTrabGeral>${tag("tpInsc",input.establishmentType)}${tag("nrInsc",digits(input.establishmentNumber))}</localTrabGeral></localTrabalho>`;
 const jornada=`<horContratual>${tag("qtdHrsSem",Number(input.weeklyHours).toFixed(2))}${tag("tpJornada",input.journeyType)}${tag("tmpParc",input.partialTimeType)}${tag("horNoturno",input.nightWork)}${tag("dscJorn",input.journeyDescription)}</horContratual>`;
 const contrato=`<infoContrato>${tag("nmCargo",input.positionName)}${tag("CBOCargo",digits(input.cboCode))}${input.functionName?tag("nmFuncao",input.functionName):""}${input.functionName?tag("CBOFuncao",digits(input.functionCbo??"")):""}${tag("codCateg",input.categoryCode)}${remuneracao}${duracao}${local}${jornada}</infoContrato>`;
 const vinculo=`<vinculo>${tag("tpRegPrev",input.socialSecurityRegimeType)}${celetista}${contrato}</vinculo>`;
 return root(`http://www.esocial.gov.br/schema/evt/evtAltContratual/${LAYOUT}`,"evtAltContratual",eventKey,`${ideEvento(input.environment,input.receipt)}${ideEmpregador(input.employerType,input.employerNumber)}<ideVinculo>${tag("cpfTrab",digits(input.cpf))}${tag("matricula",input.registrationNumber)}</ideVinculo><altContratual>${tag("dtAlteracao",input.changeDate)}${opt("dtEf",input.effectDate)}${opt("dscAlt",input.description)}${vinculo}</altContratual>`);
}
