import{describe,expect,it}from"vitest";
import{mitFilename,renderMitJson,validateMitDocument,type MitDocument}from"@/lib/rh/integrations/mit-json";

const noMovement:MitDocument={PeriodoApuracao:{MesApuracao:8,AnoApuracao:2026},DadosIniciais:{SemMovimento:true,QualificacaoPj:1,ResponsavelApuracao:{CpfResponsavel:"12345678900"}}};
const movement:MitDocument={PeriodoApuracao:{MesApuracao:8,AnoApuracao:2026},DadosIniciais:{SemMovimento:false,QualificacaoPj:1,TributacaoLucro:3,VariacoesMonetarias:2,ResponsavelApuracao:{CpfResponsavel:"12345678900",EmailResponsavel:"responsavel@example.com"}},Debitos:{ContribuicoesDiversas:{ListaDebitos:[{IdDebito:1,CodigoDebito:"123456",ValorDebito:777.55}]}}};

describe("MIT JSON 1.0",()=>{
 it("renderiza apuração sem movimento no layout oficial",()=>{const json=renderMitJson(noMovement);expect(JSON.parse(json)).toEqual(noMovement);expect(mitFilename("12345678",noMovement)).toBe("12345678-MIT-202608.json");});
 it("renderiza apuração com movimento e débito sequencial",()=>{const result=validateMitDocument(movement);expect(result).toEqual({valid:true,errors:[]});expect(JSON.parse(renderMitJson(movement)).Debitos.ContribuicoesDiversas.ListaDebitos[0].ValorDebito).toBe(777.55);});
 it("bloqueia movimento sem débitos e sem variações monetárias",()=>{const invalid:MitDocument={PeriodoApuracao:{MesApuracao:8,AnoApuracao:2026},DadosIniciais:{SemMovimento:false,QualificacaoPj:1,TributacaoLucro:3,ResponsavelApuracao:{CpfResponsavel:"12345678900"}}};const result=validateMitDocument(invalid);expect(result.valid).toBe(false);expect(result.errors.join(" ")).toMatch(/VariacoesMonetarias/);expect(result.errors.join(" ")).toMatch(/grupo de débito/);});
 it("bloqueia IDs de débito não sequenciais",()=>{const invalid:MitDocument={...movement,Debitos:{ContribuicoesDiversas:{ListaDebitos:[{IdDebito:2,CodigoDebito:"123456",ValorDebito:10}]}}};expect(validateMitDocument(invalid).errors.join(" ")).toMatch(/sequencial/);});
});
