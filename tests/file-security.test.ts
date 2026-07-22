import{describe,expect,it}from"vitest";
import{
 assertFileSecurityInput,
 FILE_SECURITY_MAX_BYTES,
 parseClamAvResponse,
 sanitizeFileName
}from"@/lib/file-security/domain";

describe("file security domain",()=>{
 it("sanitiza caminhos e caracteres perigosos",()=>{
  expect(sanitizeFileName("../../contrato\u0000 final?.pdf")).toBe("contrato final-.pdf");
 });

 it("aceita PDF dentro do limite",()=>{
  expect(assertFileSecurityInput({filename:"contrato.pdf",contentType:"application/pdf",sizeBytes:1024})).toMatchObject({filename:"contrato.pdf"});
 });

 it("bloqueia tipo não permitido",()=>{
  expect(()=>assertFileSecurityInput({filename:"script.html",contentType:"text/html",sizeBytes:100})).toThrow("Tipo de arquivo não permitido");
 });

 it("bloqueia arquivo acima de 25 MB",()=>{
  expect(()=>assertFileSecurityInput({filename:"grande.pdf",contentType:"application/pdf",sizeBytes:FILE_SECURITY_MAX_BYTES+1})).toThrow("excede o limite");
 });

 it("interpreta arquivo limpo",()=>{
  expect(parseClamAvResponse("stream: OK\0")).toEqual({status:"CLEAN",provider:"clamav",signature:null,rawCode:"OK"});
 });

 it("interpreta assinatura encontrada",()=>{
  expect(parseClamAvResponse("stream: Eicar-Signature FOUND\0")).toEqual({status:"BLOCKED",provider:"clamav",signature:"Eicar-Signature",rawCode:"FOUND"});
 });

 it("falha fechado para resposta desconhecida",()=>{
  expect(parseClamAvResponse("UNKNOWN")).toMatchObject({status:"ERROR",rawCode:"ERROR"});
 });
});
