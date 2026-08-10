import{execFileSync,spawnSync}from"node:child_process";
import{mkdtempSync,readFileSync,writeFileSync}from"node:fs";
import{tmpdir}from"node:os";
import{join}from"node:path";
import{describe,expect,it}from"vitest";
import{buildS1010,makeEsocialEventId}from"@/lib/rh/integrations/esocial-xml";
import{canonicalizeEsocialSignableElement,signEsocialXmlWithMaterial}from"@/lib/rh/integrations/esocial-signature-core";

// Mesma regra do gate XSD: obrigatório onde o job se comprometeu a provisionar,
// pulando com motivo onde não. `xmlsec1` e `xmllint` não existem no runner do
// `quality` genérico, e reprová-lo por isso não media a assinatura — media o
// `apt`. Quem instala é o `rh-esocial-generation.yml`, e é ele que declara
// ESOCIAL_GATES_OBRIGATORIOS=1.
function binarioDisponivel(name:string,args=["--version"]){const probe=spawnSync(name,args,{encoding:"utf8"});return !probe.error&&probe.status===0;}
const OBRIGATORIO=process.env.ESOCIAL_GATES_OBRIGATORIOS==="1";
const FALTANDO=["xmllint","xmlsec1"].filter(nome=>!binarioDisponivel(nome))
 .concat(binarioDisponivel("openssl",["version"])?[]:["openssl"]);
function requireBinary(name:string,args=["--version"]){if(!binarioDisponivel(name,args))throw new Error(`${name} é obrigatório para o gate de interoperabilidade XMLDSig.`);}
function certBase64(pem:string){return pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g,"");}

const eventKey=makeEsocialEventId(1,"12345678000199",new Date("2026-08-09T11:00:00Z"),1);
const unsigned=buildS1010({eventKey,environment:"RESTRICTED",operation:"INCLUDE",employerType:1,employerNumber:"12345678000199",rubricCode:"XMLSEC",tableCode:"1",validFrom:"2026-01-01",description:"Rubrica XMLSec",natureCode:"1000",rubricType:"1",codIncCP:"11",codIncIRRF:"11",codIncFGTS:"11"});

describe("eSocial XMLDSig interoperability",()=>{
 it("exige os binários no job que prometeu instalá-los",()=>{
  // Roda sempre. Se o `rh-esocial-generation.yml` perder o `apt-get install`,
  // este teste reprova — o gate não some junto com o provisionamento.
  if(OBRIGATORIO)expect(FALTANDO,"binários ausentes num job com ESOCIAL_GATES_OBRIGATORIOS=1").toEqual([]);
  else if(FALTANDO.length)console.log(`Gate XMLDSig não executado: ${FALTANDO.join(", ")} ausente(s) neste runner.`);
 });

 it.skipIf(FALTANDO.length>0)("produz a mesma C14N do xmllint e assinatura verificável pelo xmlsec1",()=>{
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
