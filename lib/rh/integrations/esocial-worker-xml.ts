import { makeEsocialEventId,normalizeEmployerRegistrationNumber,type EsocialEnvironment } from "./esocial-xml";

const LAYOUT="v_S_01_03_00";
const VER_PROC=process.env.ESOCIAL_PROCESS_VERSION?.trim()||"Innovar-RH/0.1";
function x(value:unknown){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}
function tag(name:string,value:unknown){return `<${name}>${x(value)}</${name}>`;}
function opt(name:string,value:unknown){return value===null||value===undefined||value===""?"":tag(name,value);}
function digits(value:string){return value.replace(/\D/g,"");}
function tpAmb(environment:EsocialEnvironment){return environment==="PRODUCTION"?1:2;}
function ideEvento(environment:EsocialEnvironment,receipt?:string|null){return `<ideEvento>${tag("indRetif",receipt?2:1)}${receipt?tag("nrRecibo",receipt):""}${tag("tpAmb",tpAmb(environment))}${tag("procEmi",1)}${tag("verProc",VER_PROC)}</ideEvento>`;}
function ideEmpregador(type:1|2,number:string){return `<ideEmpregador>${tag("tpInsc",type)}${tag("nrInsc",normalizeEmployerRegistrationNumber(type,number))}</ideEmpregador>`;}
function root(namespace:string,eventTag:string,eventKey:string,body:string){return `<eSocial xmlns="${namespace}"><${eventTag} Id="${x(eventKey)}">${body}</${eventTag}></eSocial>`;}

export type S2190Input={
 environment:EsocialEnvironment;employerType:1|2;employerNumber:string;cpf:string;birthDate:string;admissionDate:string;registrationNumber:string;
 categoryCode:string;activityNature:1|2;cboCode:string;salary:number;salaryUnit:1|2|3|4|5|6|7;contractType:1|2|3;contractEndDate?:string|null;
 receipt?:string|null;eventKey?:string;
};
export function buildS2190(input:S2190Input){
 const eventKey=input.eventKey??makeEsocialEventId(input.employerType,input.employerNumber);
 if(digits(input.cpf).length!==11)throw new Error("S-2190 exige CPF com 11 dígitos.");
 if(!/^\d{3}$/.test(input.categoryCode))throw new Error("S-2190 exige codCateg com 3 dígitos.");
 if(!/^\d{6}$/.test(digits(input.cboCode)))throw new Error("S-2190 exige CBOCargo com 6 dígitos.");
 if(input.contractType===2&&!input.contractEndDate)throw new Error("Contrato determinado exige dtTerm no S-2190.");
 const infoRegCTPS=`<infoRegCTPS>${tag("CBOCargo",digits(input.cboCode))}${tag("vrSalFx",Number(input.salary).toFixed(2))}${tag("undSalFixo",input.salaryUnit)}${tag("tpContr",input.contractType)}${input.contractEndDate?tag("dtTerm",input.contractEndDate):""}</infoRegCTPS>`;
 const info=`<infoRegPrelim>${tag("cpfTrab",digits(input.cpf))}${tag("dtNascto",input.birthDate)}${tag("dtAdm",input.admissionDate)}${tag("matricula",input.registrationNumber)}${tag("codCateg",input.categoryCode)}${tag("natAtividade",input.activityNature)}${infoRegCTPS}</infoRegPrelim>`;
 return root(`http://www.esocial.gov.br/schema/evt/evtAdmPrelim/${LAYOUT}`,"evtAdmPrelim",eventKey,`${ideEvento(input.environment,input.receipt)}${ideEmpregador(input.employerType,input.employerNumber)}${info}`);
}

export type S2200BrazilAddress={streetType?:string|null;street:string;number:string;complement?:string|null;neighborhood?:string|null;postalCode:string;cityIbgeCode:string;state:string};
export type S2200ImmigrantInfo={residenceTerm:1|2;entryCondition:1|2|3|4|5|6|7};
export type S2200TemporaryInfo={legalHypothesis:1|2;justification:string;clientRegistrationType:1|2;clientRegistrationNumber:string;substitutedCpfs?:string[]};
export type S2200ApprenticeInfo={hiringMode:1|2;qualifyingEntityTaxId?:string|null;indirectRegistrationType?:1|2|null;indirectRegistrationNumber?:string|null;practiceTaxId?:string|null};
export type S2200Input={
 environment:EsocialEnvironment;employerType:1|2;employerNumber:string;cpf:string;fullName:string;sex:"M"|"F";raceColor:1|2|3|4|5;maritalStatus?:1|2|3|4|5|null;
 educationLevel:string;birthDate:string;birthCountryCode:string;nationalityCountryCode:string;address:S2200BrazilAddress;phone?:string|null;email?:string|null;immigrant?:S2200ImmigrantInfo|null;
 registrationNumber:string;workRegimeType:1;socialSecurityRegimeType:1|3;admissionDate:string;admissionType:1;admissionIndicator:1;workRegimeJourney:1|2|3|4;
 activityNature:1|2;unionBaseMonth?:number|null;unionTaxId:string;categoryCode:string;positionName:string;cboCode:string;salary:number;salaryUnit:1|2|3|4|5|6|7;
 contractType:1|2|3;contractEndDate?:string|null;reciprocalTerminationClause?:"S"|"N"|null;determinedObject?:string|null;establishmentType:1|3|4;establishmentNumber:string;
 weeklyHours:number;journeyType:2|3|4|5|6|7|9;partialTimeType:0|1|2|3;nightWork:"S"|"N";journeyDescription:string;fgtsOptionDate?:string|null;
 temporary?:S2200TemporaryInfo|null;apprentice?:S2200ApprenticeInfo|null;receipt?:string|null;eventKey?:string;
};

function immigrantXml(input:S2200Input){
 const isImmigrant=input.nationalityCountryCode!=="105";
 if(!isImmigrant){if(input.immigrant)throw new Error("trabImig não deve ser informado para nacionalidade brasileira.");return "";}
 if(!input.immigrant)throw new Error("Trabalhador imigrante exige tmpResid e condIng.");
 const{residenceTerm,entryCondition}=input.immigrant;
 if(residenceTerm===1&&[2,5].includes(entryCondition))throw new Error("condIng incompatível com residência por prazo indeterminado.");
 if(residenceTerm===2&&entryCondition===1)throw new Error("condIng incompatível com residência por prazo determinado.");
 return `<trabImig>${tag("tmpResid",residenceTerm)}${tag("condIng",entryCondition)}</trabImig>`;
}

function temporaryXml(input:S2200Input){
 if(input.categoryCode!=="106"){if(input.temporary)throw new Error("trabTemporario só pode ser usado na categoria 106.");return "";}
 const t=input.temporary;if(!t)throw new Error("Categoria 106 exige dados de trabalho temporário.");
 if(!t.justification.trim())throw new Error("Trabalho temporário exige justificativa da contratação.");
 const client=digits(t.clientRegistrationNumber);if(t.clientRegistrationType===1&&client.length!==14)throw new Error("Tomador temporário CNPJ deve ter 14 dígitos.");if(t.clientRegistrationType===2&&client.length!==11)throw new Error("Tomador temporário CPF deve ter 11 dígitos.");
 const cpfs=(t.substitutedCpfs??[]).map(digits).filter(Boolean);if(cpfs.length>9||cpfs.some(c=>c.length!==11))throw new Error("CPFs substituídos devem conter até 9 CPFs de 11 dígitos.");if(t.legalHypothesis===1&&cpfs.length===0)throw new Error("Hipótese de substituição transitória exige trabalhador substituído.");if(t.legalHypothesis===2&&cpfs.length>0)throw new Error("CPFs substituídos só são admitidos na hipótese legal 1.");
 return `<trabTemporario>${tag("hipLeg",t.legalHypothesis)}${tag("justContr",t.justification)}<ideEstabVinc>${tag("tpInsc",t.clientRegistrationType)}${tag("nrInsc",client)}</ideEstabVinc>${cpfs.map(c=>`<ideTrabSubstituido>${tag("cpfTrabSubst",c)}</ideTrabSubstituido>`).join("")}</trabTemporario>`;
}

function apprenticeXml(input:S2200Input){
 if(input.categoryCode!=="103"){if(input.apprentice)throw new Error("aprend só pode ser usado na categoria 103.");return "";}
 const a=input.apprentice;if(!a)throw new Error("Categoria 103 exige informações de aprendiz.");
 let body=tag("indAprend",a.hiringMode);
 if(a.hiringMode===1){const cnpj=digits(a.qualifyingEntityTaxId??"");if(cnpj.length!==14)throw new Error("Aprendiz direto exige CNPJ da entidade qualificadora.");body+=tag("cnpjEntQual",cnpj);if(a.indirectRegistrationType||a.indirectRegistrationNumber)throw new Error("Aprendiz direto não deve informar estabelecimento de contratação indireta.");}
 else{const type=a.indirectRegistrationType;const number=digits(a.indirectRegistrationNumber??"");if(!type)throw new Error("Aprendiz indireto exige tipo de inscrição do estabelecimento cumpridor da cota.");if(type===1&&number.length!==14)throw new Error("Aprendiz indireto com CNPJ exige 14 dígitos.");if(type===2&&number.length!==11)throw new Error("Aprendiz indireto com CPF exige 11 dígitos.");body+=tag("tpInsc",type)+tag("nrInsc",number);if(a.qualifyingEntityTaxId)throw new Error("cnpjEntQual é exclusivo da contratação direta.");}
 if(a.practiceTaxId){const practice=digits(a.practiceTaxId);if(practice.length!==14)throw new Error("CNPJ da prática do aprendiz deve ter 14 dígitos.");body+=tag("cnpjPrat",practice);}
 return `<aprend>${body}</aprend>`;
}

export function buildS2200StandardClt(input:S2200Input){
 const eventKey=input.eventKey??makeEsocialEventId(input.employerType,input.employerNumber);
 if(input.workRegimeType!==1)throw new Error("Gerador S-2200 atual suporta regime CLT.");
 if(![1,3].includes(input.socialSecurityRegimeType))throw new Error("Gerador S-2200 CLT suporta RGPS ou regime previdenciário no exterior.");
 if(input.categoryCode==="104")throw new Error("Empregado doméstico exige fluxo próprio e não é suportado por este gerador empresarial.");
 if(!/^\d{11}$/.test(digits(input.cpf)))throw new Error("S-2200 exige CPF com 11 dígitos.");
 if(!/^\d{6}$/.test(digits(input.cboCode)))throw new Error("S-2200 exige CBOCargo com 6 dígitos.");
 if(!/^\d{14}$/.test(digits(input.unionTaxId)))throw new Error("S-2200 CLT exige CNPJ sindical com 14 dígitos.");
 if(!/^\d{8}$/.test(digits(input.address.postalCode))||!/^\d{7}$/.test(digits(input.address.cityIbgeCode)))throw new Error("Endereço S-2200 exige CEP e código IBGE válidos em formato.");
 if(input.contractType===2&&!input.contractEndDate)throw new Error("Contrato determinado exige data final.");
 if(input.contractType===3&&!input.determinedObject)throw new Error("Contrato vinculado a fato exige objeto determinante.");

 const trabalhador=`<trabalhador>${tag("cpfTrab",digits(input.cpf))}${tag("nmTrab",input.fullName)}${tag("sexo",input.sex)}${tag("racaCor",input.raceColor)}${opt("estCiv",input.maritalStatus)}${tag("grauInstr",input.educationLevel)}<nascimento>${tag("dtNascto",input.birthDate)}${tag("paisNascto",input.birthCountryCode)}${tag("paisNac",input.nationalityCountryCode)}</nascimento><endereco><brasil>${opt("tpLograd",input.address.streetType)}${tag("dscLograd",input.address.street)}${tag("nrLograd",input.address.number)}${opt("complemento",input.address.complement)}${opt("bairro",input.address.neighborhood)}${tag("cep",digits(input.address.postalCode))}${tag("codMunic",digits(input.address.cityIbgeCode))}${tag("uf",input.address.state)}</brasil></endereco>${immigrantXml(input)}${input.phone||input.email?`<contato>${opt("fonePrinc",input.phone?digits(input.phone):null)}${opt("emailPrinc",input.email)}</contato>`:""}</trabalhador>`;

 const fgts=input.fgtsOptionDate?`<FGTS>${tag("dtOpcFGTS",input.fgtsOptionDate)}</FGTS>`:"";
 const celetista=`<infoCeletista>${tag("dtAdm",input.admissionDate)}${tag("tpAdmissao",input.admissionType)}${tag("indAdmissao",input.admissionIndicator)}${tag("tpRegJor",input.workRegimeJourney)}${tag("natAtividade",input.activityNature)}${opt("dtBase",input.unionBaseMonth)}${tag("cnpjSindCategProf",digits(input.unionTaxId))}${fgts}${temporaryXml(input)}${apprenticeXml(input)}</infoCeletista>`;
 const remuneracao=`<remuneracao>${tag("vrSalFx",Number(input.salary).toFixed(2))}${tag("undSalFixo",input.salaryUnit)}</remuneracao>`;
 const duracao=`<duracao>${tag("tpContr",input.contractType)}${input.contractEndDate?tag("dtTerm",input.contractEndDate):""}${input.reciprocalTerminationClause?tag("clauAssec",input.reciprocalTerminationClause):""}${input.determinedObject?tag("objDet",input.determinedObject):""}</duracao>`;
 const local=`<localTrabalho><localTrabGeral>${tag("tpInsc",input.establishmentType)}${tag("nrInsc",digits(input.establishmentNumber))}</localTrabGeral></localTrabalho>`;
 const jornada=`<horContratual>${tag("qtdHrsSem",Number(input.weeklyHours).toFixed(2))}${tag("tpJornada",input.journeyType)}${tag("tmpParc",input.partialTimeType)}${tag("horNoturno",input.nightWork)}${tag("dscJorn",input.journeyDescription)}</horContratual>`;
 const contrato=`<infoContrato>${tag("nmCargo",input.positionName)}${tag("CBOCargo",digits(input.cboCode))}${tag("codCateg",input.categoryCode)}${remuneracao}${duracao}${local}${jornada}</infoContrato>`;
 const vinculo=`<vinculo>${tag("matricula",input.registrationNumber)}${tag("tpRegTrab",input.workRegimeType)}${tag("tpRegPrev",input.socialSecurityRegimeType)}${tag("cadIni","N")}<infoRegimeTrab>${celetista}</infoRegimeTrab>${contrato}</vinculo>`;
 return root(`http://www.esocial.gov.br/schema/evt/evtAdmissao/${LAYOUT}`,"evtAdmissao",eventKey,`${ideEvento(input.environment,input.receipt)}${ideEmpregador(input.employerType,input.employerNumber)}${trabalhador}${vinculo}`);
}
