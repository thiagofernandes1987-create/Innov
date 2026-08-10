import{describe,expect,it}from"vitest";
import{buildS2230}from"@/lib/rh/integrations/esocial-leave-xml";
import{makeEsocialEventId}from"@/lib/rh/integrations/esocial-xml";
import{validateWithOfficialEsocialXsd}from"./esocial-official-xsd";
const base={environment:"RESTRICTED" as const,employerType:1 as const,employerNumber:"12345678000199",cpf:"12345678901",registrationNumber:"MAT-001",mode:"START" as const,startDate:"2026-08-01",eventKey:makeEsocialEventId(1,"12345678000199",new Date("2026-08-09T12:00:00Z"),2)};
function official(xml:string,label:string){validateWithOfficialEsocialXsd(xml,label);return xml;}
describe("S-2230 grupos especiais",()=>{
 it("gera motivo 14 com cessão e ônus",()=>{const xml=official(buildS2230({...base,reasonCode:"14",cession:{cnpj:"11222333000144",burden:1}}),"S-2230-cessao");expect(xml).toContain("<infoCessao><cnpjCess>11222333000144</cnpjCess><infOnus>1</infOnus></infoCessao>");});
 it("gera motivo 24 com mandato sindical",()=>{const xml=official(buildS2230({...base,reasonCode:"24",unionMandate:{cnpj:"22333444000155",remunerationBurden:3}}),"S-2230-mandato-sindical");expect(xml).toContain("<infoMandSind>");expect(xml).toContain("<infOnusRemun>3</infOnusRemun>");});
 it("gera motivo 22 com mandato eletivo",()=>{const xml=official(buildS2230({...base,reasonCode:"22",electiveMandate:{cnpj:"33444555000166"}}),"S-2230-mandato-eletivo");expect(xml).toContain("<infoMandElet><cnpjMandElet>33444555000166</cnpjMandElet></infoMandElet>");});
 it("gera retificação 01 para 03 com revisão administrativa",()=>{const xml=official(buildS2230({...base,reasonCode:"03",receipt:"1.2.0000000000000000000",rectification:{previousReasonCode:"01",origin:2,processType:1,processNumber:"12345678901234567"}}),"S-2230-retificacao");expect(xml).toContain("<indRetif>2</indRetif>");expect(xml).toContain("<infoRetif><origRetif>2</origRetif><tpProc>1</tpProc><nrProc>12345678901234567</nrProc></infoRetif>");});
 it("bloqueia motivo 14 sem infoCessao",()=>{expect(()=>buildS2230({...base,reasonCode:"14"})).toThrow(/cessão/);});
 it("bloqueia motivo 24 sem infoMandSind",()=>{expect(()=>buildS2230({...base,reasonCode:"24"})).toThrow(/mandato sindical/);});
});
