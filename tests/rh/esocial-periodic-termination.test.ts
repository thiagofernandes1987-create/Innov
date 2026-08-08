import{describe,expect,it}from"vitest";
import{buildS1200,buildS1210,buildS1298,buildS1299}from"@/lib/rh/integrations/esocial-periodic-xml";
import{buildS2299,buildS2399}from"@/lib/rh/integrations/esocial-termination-xml";
import{validateWithOfficialEsocialXsd}from"./esocial-official-xsd";

const employer={environment:"RESTRICTED" as const,employerType:1 as const,employerNumber:"12345678000199"};
const line={lineCode:"SALARY_BALANCE",amount:2500,rubricCode:"SALDO",tableCode:"1",establishmentType:1 as const,establishmentNumber:"12345678000199",lotacaoCode:"ADM"};
function official(xml:string,label:string){validateWithOfficialEsocialXsd(xml,label);return xml;}

describe("eSocial periódicos e desligamento",()=>{
 it("gera e valida S-1200 com remuneração",()=>{const xml=official(buildS1200({...employer,period:"2026-08",cpf:"12345678901",registrationNumber:"MAT001",categoryCode:"101",demonstrativeId:"FOL001",establishmentType:1,establishmentNumber:"12345678000199",lotacaoCode:"ADM",lines:[{rubricCode:"SALARIO",tableCode:"1",amount:5000,quantity:1}]}),"S-1200");expect(xml).toContain("evtRemun");expect(xml).toContain("<codRubr>SALARIO</codRubr>");});
 it("gera e valida S-1210",()=>{const xml=official(buildS1210({...employer,period:"2026-08",cpf:"12345678901",paymentDate:"2026-09-05",paymentType:1,referencePeriod:"2026-08",demonstrativeId:"FOL001",netAmount:4100}),"S-1210");expect(xml).toContain("evtPgtos");expect(xml).toContain("<vrLiq>4100.00</vrLiq>");expect(()=>buildS1210({...employer,period:"2026-08",cpf:"12345678901",paymentDate:"2026-09-05",paymentType:1,referencePeriod:"2026-08",demonstrativeId:"FOL001",netAmount:-1})).toThrow(/líquido negativo/);});
 it("gera e valida S-1299 e S-1298",()=>{const close=official(buildS1299({...employer,period:"2026-08",hasRemuneration:true,hasPayments:true,hasProduction:false,hasNonPayrollContracting:false,hasAdditionalPeriodInfo:false}),"S-1299");const reopen=official(buildS1298({...employer,period:"2026-08"}),"S-1298");expect(close).toContain("evtFechaEvPer");expect(reopen).toContain("evtReabreEvPer");});
 it("gera e valida S-2299 sem indPDV quando não aplicável",()=>{const xml=official(buildS2299({...employer,cpf:"12345678901",registrationNumber:"MAT001",reasonCode:"01",terminationDate:"2026-08-20",noticeIndemnified:true,projectedNoticeEnd:"2026-09-19",pensionPercentage:null,pensionAmount:null,lines:[line],demonstrativeId:"RES001"}),"S-2299");expect(xml).toContain("evtDeslig");expect(xml).toContain("<detVerbas>");expect(xml).not.toContain("<indPDV>N</indPDV>");});
 it("bloqueia S-2299 com aviso indenizado sem projeção",()=>{expect(()=>buildS2299({...employer,cpf:"12345678901",registrationNumber:"MAT001",reasonCode:"01",terminationDate:"2026-08-20",noticeIndemnified:true,lines:[line],demonstrativeId:"RES001"})).toThrow(/data projetada/);});
 it("gera e valida S-2399 categoria 721 sem matrícula e com verbas",()=>{const xml=official(buildS2399({...employer,cpf:"12345678901",categoryCode:"721",terminationDate:"2026-08-20",reasonCode:"01",lines:[line],demonstrativeId:"TSV001"}),"S-2399");expect(xml).toContain("evtTSVTermino");expect(xml).toContain("<codCateg>721</codCateg>");expect(xml).toContain("<mtvDesligTSV>01</mtvDesligTSV>");});
 it("bloqueia verbas S-2399 fora da categoria 721 no caminho suportado",()=>{expect(()=>buildS2399({...employer,cpf:"12345678901",categoryCode:"701",registrationNumber:"TSV001",terminationDate:"2026-08-20",reasonCode:"01",lines:[line],demonstrativeId:"TSV001"})).toThrow(/categoria 721/);});
});
