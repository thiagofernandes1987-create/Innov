import { describe,expect,it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { buildS1000,buildS1005,buildS1010,buildS1020,makeEsocialEventId } from "@/lib/rh/integrations/esocial-xml";
import { buildS2190,buildS2200StandardClt } from "@/lib/rh/integrations/esocial-worker-xml";
import { signEsocialXmlWithMaterial,verifyGeneratedEsocialSignature } from "@/lib/rh/integrations/esocial-signature-core";

function eventKey(){return makeEsocialEventId(1,"12345678000199",new Date("2026-08-07T12:00:00Z"),1);}
const common={eventKey:eventKey(),environment:"RESTRICTED" as const,operation:"INCLUDE" as const,employerType:1 as const,employerNumber:"12345678000199"};

describe("eSocial XML generation",()=>{
  it("gera Id no formato deterministico de 36 caracteres",()=>{
    expect(eventKey()).toHaveLength(36);
    expect(eventKey()).toMatch(/^ID1\d{33}$/);
  });

  it("gera S-1000, S-1005, S-1010 e S-1020 com namespace S-1.3 e Id",()=>{
    const docs=[
      buildS1000({...common,validFrom:"2026-01-01",classTrib:"99",indCoop:0,indConstr:0,indDesFolha:0,indOptRegEletron:1,indEntEd:0,indEtt:0}),
      buildS1005({...common,establishmentType:1,establishmentNumber:"12345678000199",validFrom:"2026-01-01",cnaePreponderant:"4120400",ratRate:2,fap:1}),
      buildS1010({...common,rubricCode:"SALARIO",tableCode:"1",validFrom:"2026-01-01",description:"Salário mensal",natureCode:"1000",rubricType:"1",codIncCP:"11",codIncIRRF:"11",codIncFGTS:"11"}),
      buildS1020({...common,lotacaoCode:"ADM",validFrom:"2026-01-01",lotacaoType:"01",fpasCode:"515",thirdPartiesCode:"0115"})
    ];
    for(const xml of docs){
      expect(xml).toContain(`Id="${common.eventKey}"`);
      expect(xml).toContain("v_S_01_03_00");
      expect(xml).toContain("<tpAmb>2</tpAmb>");
      expect(xml).toContain("<nrInsc>12345678</nrInsc>");
    }
  });

  it("gera S-2190 com infoRegCTPS exigida no caminho CLT atual",()=>{
    const xml=buildS2190({environment:"RESTRICTED",employerType:1,employerNumber:"12345678000199",cpf:"12345678901",birthDate:"1990-01-01",admissionDate:"2026-08-10",registrationNumber:"MAT-001",categoryCode:"101",activityNature:1,cboCode:"717020",salary:5000,salaryUnit:5,contractType:1,eventKey:eventKey()});
    expect(xml).toContain("evtAdmPrelim");
    expect(xml).toContain("<indRetif>1</indRetif>");
    expect(xml).toContain("<cpfTrab>12345678901</cpfTrab>");
    expect(xml).toContain("<infoRegCTPS>");
    expect(xml).toContain("<CBOCargo>717020</CBOCargo>");
    expect(xml).toContain("<vrSalFx>5000.00</vrSalFx>");
    expect(xml).toContain("<tpContr>1</tpContr>");
  });

  it("gera S-2200 CLT padrão com trabalhador, vínculo, local e jornada",()=>{
    const xml=buildS2200StandardClt({environment:"RESTRICTED",employerType:1,employerNumber:"12345678000199",cpf:"12345678901",fullName:"Trabalhador Teste",sex:"M",raceColor:3,maritalStatus:1,educationLevel:"07",birthDate:"1990-01-01",birthCountryCode:"105",nationalityCountryCode:"105",address:{streetType:"R",street:"Rua Teste",number:"100",neighborhood:"Centro",postalCode:"12000000",cityIbgeCode:"3554102",state:"SP"},phone:"12999999999",email:"teste@example.com",registrationNumber:"MAT-001",workRegimeType:1,socialSecurityRegimeType:1,admissionDate:"2026-08-10",admissionType:1,admissionIndicator:1,workRegimeJourney:1,activityNature:1,unionBaseMonth:5,unionTaxId:"12345678000199",categoryCode:"101",positionName:"Pedreiro",cboCode:"715210",salary:5000,salaryUnit:5,contractType:1,establishmentType:1,establishmentNumber:"12345678000199",weeklyHours:44,journeyType:9,partialTimeType:0,nightWork:"N",journeyDescription:"Segunda a sexta 08:00-17:00 e sábado 08:00-12:00",eventKey:eventKey()});
    expect(xml).toContain("evtAdmissao");
    expect(xml).toContain("<trabalhador>");
    expect(xml).toContain("<vinculo>");
    expect(xml).toContain("<tpRegTrab>1</tpRegTrab>");
    expect(xml).toContain("<tpRegPrev>1</tpRegPrev>");
    expect(xml).toContain("<cnpjSindCategProf>12345678000199</cnpjSindCategProf>");
    expect(xml).toContain("<localTrabGeral>");
    expect(xml).toContain("<qtdHrsSem>44.00</qtdHrsSem>");
  });

  it("bloqueia S-2200 padrão para categoria com grupo específico",()=>{
    expect(()=>buildS2200StandardClt({environment:"RESTRICTED",employerType:1,employerNumber:"12345678000199",cpf:"12345678901",fullName:"Aprendiz",sex:"F",raceColor:1,educationLevel:"07",birthDate:"2007-01-01",birthCountryCode:"105",nationalityCountryCode:"105",address:{street:"Rua",number:"1",postalCode:"12000000",cityIbgeCode:"3554102",state:"SP"},registrationNumber:"A1",workRegimeType:1,socialSecurityRegimeType:1,admissionDate:"2026-08-10",admissionType:1,admissionIndicator:1,workRegimeJourney:1,activityNature:1,unionTaxId:"12345678000199",categoryCode:"103",positionName:"Aprendiz",cboCode:"411005",salary:1500,salaryUnit:5,contractType:2,contractEndDate:"2027-08-10",reciprocalTerminationClause:"N",establishmentType:1,establishmentNumber:"12345678000199",weeklyHours:30,journeyType:9,partialTimeType:2,nightWork:"N",journeyDescription:"Segunda a sexta 08:00-14:00"})).toThrow(/grupos específicos/);
  });

  it("assina RSA-SHA256 e a assinatura gerada verifica com a chave publica",()=>{
    const{privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
    const xml=buildS1010({...common,rubricCode:"HORA50",tableCode:"1",validFrom:"2026-01-01",description:"Hora extra 50%",natureCode:"1004",rubricType:"1",codIncCP:"11",codIncIRRF:"11",codIncFGTS:"11"});
    const signed=signEsocialXmlWithMaterial(xml,privateKey.export({format:"pem",type:"pkcs8"}).toString(),Buffer.from("CERTIFICADO-DE-TESTE").toString("base64"));
    expect(signed.signedXml).toContain("<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">");
    expect(signed.signedXml).toContain(`<Reference URI="#${common.eventKey}">`);
    expect(signed.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyGeneratedEsocialSignature(signed.signedInfo,signed.signatureValue,publicKey.export({format:"pem",type:"spki"}).toString())).toBe(true);
  });
});
