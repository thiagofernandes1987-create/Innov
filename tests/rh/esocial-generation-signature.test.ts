import { describe,expect,it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { buildS1000,buildS1005,buildS1010,buildS1020,makeEsocialEventId } from "@/lib/rh/integrations/esocial-xml";
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

  it("assina RSA-SHA256 e a assinatura gerada verifica com a chave publica",()=>{
    const{privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
    const xml=buildS1010({...common,rubricCode:"HORA50",tableCode:"1",validFrom:"2026-01-01",description:"Hora extra 50%",natureCode:"1004",rubricType:"1",codIncCP:"11",codIncIRRF:"11",codIncFGTS:"11"});
    const signed=signEsocialXmlWithMaterial(
      xml,
      privateKey.export({format:"pem",type:"pkcs8"}).toString(),
      Buffer.from("CERTIFICADO-DE-TESTE").toString("base64")
    );
    expect(signed.signedXml).toContain("<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">");
    expect(signed.signedXml).toContain(`<Reference URI="#${common.eventKey}">`);
    expect(signed.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyGeneratedEsocialSignature(signed.signedInfo,signed.signatureValue,publicKey.export({format:"pem",type:"spki"}).toString())).toBe(true);
  });
});
