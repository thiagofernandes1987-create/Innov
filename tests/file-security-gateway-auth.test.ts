import{describe,expect,it}from"vitest";
import{
 createFileSecurityGatewaySignature,
 verifyFileSecurityGatewaySignature
}from"@/lib/file-security/gateway-auth";

const secret="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const sha256="a".repeat(64);

describe("autenticação do gateway de arquivos",()=>{
 it("aceita assinatura HMAC recente vinculada ao hash",()=>{
  const timestamp="1784728800";
  const signature=createFileSecurityGatewaySignature({secret,timestamp,sha256});
  expect(verifyFileSecurityGatewaySignature({secret,timestamp,signature,sha256,nowSeconds:1784728800})).toBe(true);
 });

 it("rejeita alteração do conteúdo",()=>{
  const timestamp="1784728800";
  const signature=createFileSecurityGatewaySignature({secret,timestamp,sha256});
  expect(verifyFileSecurityGatewaySignature({secret,timestamp,signature,sha256:"b".repeat(64),nowSeconds:1784728800})).toBe(false);
 });

 it("rejeita timestamp fora da janela",()=>{
  const timestamp="1784728800";
  const signature=createFileSecurityGatewaySignature({secret,timestamp,sha256});
  expect(verifyFileSecurityGatewaySignature({secret,timestamp,signature,sha256,nowSeconds:1784729200})).toBe(false);
 });
});
