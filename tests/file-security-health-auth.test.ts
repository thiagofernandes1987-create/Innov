import{describe,expect,it}from"vitest";
import{
 createFileSecurityHealthSignature,
 FILE_SECURITY_HEALTH_PATH,
 verifyFileSecurityHealthSignature
}from"../lib/file-security/health-auth";

const secret="stage20-health-secret-with-at-least-32-characters";

describe("file security provider health authentication",()=>{
 it("aceita assinatura HMAC recente",()=>{
  const nowMs=1_800_000_000_000;
  const timestamp=String(Math.floor(nowMs/1000));
  const signature=createFileSecurityHealthSignature(secret,timestamp);
  expect(verifyFileSecurityHealthSignature({secret,timestamp,signature,nowMs})).toBe(true);
 });

 it("rejeita assinatura alterada",()=>{
  const nowMs=1_800_000_000_000;
  const timestamp=String(Math.floor(nowMs/1000));
  const signature=createFileSecurityHealthSignature(secret,timestamp);
  expect(verifyFileSecurityHealthSignature({secret,timestamp,signature:`0${signature.slice(1)}`,nowMs})).toBe(false);
 });

 it("rejeita timestamp fora da janela",()=>{
  const nowMs=1_800_000_000_000;
  const timestamp=String(Math.floor(nowMs/1000)-301);
  const signature=createFileSecurityHealthSignature(secret,timestamp);
  expect(verifyFileSecurityHealthSignature({secret,timestamp,signature,nowMs})).toBe(false);
 });

 it("vincula método e rota à assinatura",()=>{
  const nowMs=1_800_000_000_000;
  const timestamp=String(Math.floor(nowMs/1000));
  const signature=createFileSecurityHealthSignature(secret,timestamp,"POST",FILE_SECURITY_HEALTH_PATH);
  expect(verifyFileSecurityHealthSignature({secret,timestamp,signature,method:"GET",nowMs})).toBe(false);
 });
});
