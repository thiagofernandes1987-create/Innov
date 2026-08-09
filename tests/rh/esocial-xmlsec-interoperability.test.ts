import{execFileSync,spawnSync}from"node:child_process";
import{mkdtempSync,readFileSync,writeFileSync}from"node:fs";
import{tmpdir}from"node:os";
import{join}from"node:path";
import{describe,expect,it}from"vitest";
import{buildS1010,makeEsocialEventId}from"@/lib/rh/integrations/esocial-xml";
import{canonicalizeEsocialSignableElement,signEsocialXmlWithMaterial}from"@/lib/rh/integrations/esocial-signature-core";

function requireBinary(name:string,args=["--version"]){const probe=spawnSync(name,args,{encoding:"utf8"});if(probe.error||probe.status!==0)throw new Error(`${name} é obrigatório para o gate de interoperabilidade XMLDSig.`);}
function certBase64(pem:string){return pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g,"");}

const eventKey=makeEsocialEventId(1,"12345678000199",new Date("2026-08-09T11:00:00Z"),1);
const unsigned=buildS1010({eventKey,environment:"RESTRICTED",operation:"INCLUDE",employerType:1,employerNumber:"12345678000199",rubricCode:"XMLSEC",tableCode:"1",validFrom:"2026-01-01",description:"Rubrica XMLSec",natureCode:"1000",rubricType:"1",codIncCP:"11",codIncIRRF:"11",codIncFGTS:"11"});

describe("eSocial XMLDSig interoperability",()=>{
 it("produz a mesma C14N do xmllint e assinatura verificável pelo xmlsec1",()=>{
  requireBinary("xmllint");requireBinary("xmlsec1");requireBinary("openssl",["version"]);
  const dir=mkdtempSync(join(tmpdir(),"innov-esocial-xmlsec-")),key=join(dir,"key.pem"),cert=join(dir,"cert.pem"),publicKey=join(dir,"public.pem"),eventFile=join(dir,"event.xml"),signedFile=join(dir,"signed.xml");
  const openssl=spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",key,"-out",cert,"-subj","/CN=Innovar RH XMLDSig Test","-days","1","-sha256"],{encoding:"utf8"});
  if(openssl.status!==0)throw new Error(`Falha ao gerar certificado sintético: ${openssl.stderr}`);
  execFileSync("openssl",["pkey","-in",key,"-pubout","-out",publicKey]);
  const canonical=canonicalizeEsocialSignableElement(unsigned);writeFileSync(eventFile,canonical.canonicalEventXml,"utf8");
  const externalCanonical=execFileSync("xmllint",["--c14n",eventFile],{encoding:"utf8"});
  expect(externalCanonical).toBe(canonical.canonicalEventXml);
  const privateKey=readFileSync(key,"utf8"),certificate=readFileSync(cert,"utf8");
  const signed=signEsocialXmlWithMaterial(unsigned,privateKey,certBase64(certificate));writeFileSync(signedFile,signed.signedXml,"utf8");
  const verification=spawnSync("xmlsec1",["--verify","--pubkey-pem",publicKey,"--id-attr:Id",canonical.eventTag,signedFile],{encoding:"utf8"});
  if(verification.status!==0)throw new Error(`xmlsec1 rejeitou o XMLDSig eSocial.\nSTDOUT:\n${verification.stdout}\nSTDERR:\n${verification.stderr}`);
  expect(`${verification.stdout}\n${verification.stderr}`).toMatch(/OK|SignedInfo References \(ok\/all\):\s*1\/1/i);
 });
});
