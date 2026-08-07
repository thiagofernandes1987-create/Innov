import { describe,expect,it } from "vitest";
import { buildS1200,buildS1210,buildS1298,buildS1299 } from "@/lib/rh/integrations/esocial-periodic-xml";
import { buildS2299,buildS2399 } from "@/lib/rh/integrations/esocial-termination-xml";

const employer={environment:"RESTRICTED" as const,employerType:1 as const,employerNumber:"12345678000199"};
const line={lineCode:"SALARY_BALANCE",amount:2500,rubricCode:"SALDO",tableCode:"1",establishmentType:1 as const,establishmentNumber:"12345678000199",lotacaoCode:"ADM"};

describe("eSocial periódicos e desligamento",()=>{
  it("gera S-1200 com remuneração, lotação e rubrica",()=>{
    const xml=buildS1200({...employer,period:"2026-08",cpf:"12345678901",registrationNumber:"MAT001",categoryCode:"101",demonstrativeId:"FOL001",establishmentType:1,establishmentNumber:"12345678000199",lotacaoCode:"ADM",lines:[{rubricCode:"SALARIO",tableCode:"1",amount:5000,quantity:1}]});
    expect(xml).toContain("evtRemun");
    expect(xml).toContain("<perApur>2026-08</perApur>");
    expect(xml).toContain("<matricula>MAT001</matricula>");
    expect(xml).toContain("<codRubr>SALARIO</codRubr>");
    expect(xml).toContain("<vrRubr>5000.00</vrRubr>");
  });
  it("gera S-1210 apenas com pagamento líquido não negativo",()=>{
    const xml=buildS1210({...employer,period:"2026-08",cpf:"12345678901",paymentDate:"2026-09-05",paymentType:1,referencePeriod:"2026-08",demonstrativeId:"FOL001",netAmount:4100});
    expect(xml).toContain("evtPgtos");
    expect(xml).toContain("<dtPgto>2026-09-05</dtPgto>");
    expect(xml).toContain("<vrLiq>4100.00</vrLiq>");
    expect(()=>buildS1210({...employer,period:"2026-08",cpf:"12345678901",paymentDate:"2026-09-05",paymentType:1,referencePeriod:"2026-08",demonstrativeId:"FOL001",netAmount:-1})).toThrow(/líquido negativo/);
  });
  it("gera S-1299 e S-1298 com a mesma competência",()=>{
    const close=buildS1299({...employer,period:"2026-08",hasRemuneration:true,hasPayments:true,hasProduction:false,hasNonPayrollContracting:false,hasAdditionalPeriodInfo:false});
    const reopen=buildS1298({...employer,period:"2026-08"});
    expect(close).toContain("evtFechaEvPer");
    expect(close).toContain("<evtRemun>S</evtRemun>");
    expect(close).toContain("<evtPgtos>S</evtPgtos>");
    expect(reopen).toContain("evtReabreEvPer");
    expect(reopen).toContain("<perApur>2026-08</perApur>");
  });
  it("gera S-2299 com verbas rescisórias mapeadas",()=>{
    const xml=buildS2299({...employer,cpf:"12345678901",registrationNumber:"MAT001",reasonCode:"01",terminationDate:"2026-08-20",noticeIndemnified:true,projectedNoticeEnd:"2026-09-19",pensionPercentage:null,pensionAmount:null,lines:[line],demonstrativeId:"RES001"});
    expect(xml).toContain("evtDeslig");
    expect(xml).toContain("<mtvDeslig>01</mtvDeslig>");
    expect(xml).toContain("<dtProjFimAPI>2026-09-19</dtProjFimAPI>");
    expect(xml).toContain("<detVerbas>");
    expect(xml).toContain("<codRubr>SALDO</codRubr>");
  });
  it("bloqueia S-2299 com aviso indenizado sem projeção",()=>{
    expect(()=>buildS2299({...employer,cpf:"12345678901",registrationNumber:"MAT001",reasonCode:"01",terminationDate:"2026-08-20",noticeIndemnified:true,lines:[line],demonstrativeId:"RES001"})).toThrow(/data projetada/);
  });
  it("gera S-2399 para TSVE com categoria explícita",()=>{
    const xml=buildS2399({...employer,cpf:"12345678901",categoryCode:"701",registrationNumber:"TSV001",terminationDate:"2026-08-20",reasonCode:"01",lines:[line],demonstrativeId:"TSV001"});
    expect(xml).toContain("evtTSVTermino");
    expect(xml).toContain("<codCateg>701</codCateg>");
    expect(xml).toContain("<dtTerm>2026-08-20</dtTerm>");
  });
});
