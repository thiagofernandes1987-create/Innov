import{describe,expect,it}from"vitest";
import{
 assertFileContentSignature,
 assertFileSecurityInput,
 FILE_SECURITY_MAX_BYTES,
 parseClamAvResponse,
 sanitizeFileName
}from"../lib/file-security/domain";

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

 it("confirma assinatura PDF",()=>{
  expect(()=>assertFileContentSignature("application/pdf",Buffer.from("%PDF-1.7\nconteudo"))).not.toThrow();
 });

 it("bloqueia MIME divergente do conteúdo",()=>{
  expect(()=>assertFileContentSignature("application/pdf",Buffer.from("nao e pdf"))).toThrow("não corresponde ao formato");
 });

 it("confirma estrutura mínima DOCX",()=>{
  const docx=Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.from("[Content_Types].xml word/document.xml")]);
  expect(()=>assertFileContentSignature("application/vnd.openxmlformats-officedocument.wordprocessingml.document",docx)).not.toThrow();
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
