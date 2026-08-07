import "server-only";

import { createHash, createSign, createVerify, X509Certificate } from "node:crypto";

const DSIG_NS="http://www.w3.org/2000/09/xmldsig#";
const C14N="http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const RSA_SHA256="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const SHA256="http://www.w3.org/2001/04/xmlenc#sha256";
const ENVELOPED="http://www.w3.org/2000/09/xmldsig#enveloped-signature";

function compact(value:string){return value.trim().replace(/^<\?xml[^>]*>\s*/i,"");}
function b64Sha256(value:string){return createHash("sha256").update(value,"utf8").digest("base64");}
function certificateBodyFromPem(pem:string){
  const cert=new X509Certificate(pem);
  return cert.raw.toString("base64");
}

export function extractEsocialSignableElement(unsignedXml:string){
  const xml=compact(unsignedXml);
  if(!/^<eSocial\b/.test(xml))throw new Error("XML eSocial inválido: raiz eSocial ausente.");
  if(/<Signature\b/.test(xml))throw new Error("XML já contém Signature; não é permitido assinar novamente.");
  const match=xml.match(/<([A-Za-z0-9_:-]+)\b([^>]*\bId=["'](ID[^"']+)["'][^>]*)>[\s\S]*?<\/\1>/);
  if(!match)throw new Error("Elemento de evento com atributo Id não encontrado.");
  return{eventKey:match[3],eventXml:match[0],documentXml:xml};
}

export function buildSignedInfo(eventKey:string,digestValue:string){
  return `<SignedInfo xmlns="${DSIG_NS}"><CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod><SignatureMethod Algorithm="${RSA_SHA256}"></SignatureMethod><Reference URI="#${eventKey}"><Transforms><Transform Algorithm="${ENVELOPED}"></Transform><Transform Algorithm="${C14N}"></Transform></Transforms><DigestMethod Algorithm="${SHA256}"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
}

export function signEsocialXmlWithMaterial(unsignedXml:string,privateKeyPem:string,certificateBase64:string){
  const parsed=extractEsocialSignableElement(unsignedXml);
  const digestValue=b64Sha256(parsed.eventXml);
  const signedInfo=buildSignedInfo(parsed.eventKey,digestValue);
  const signer=createSign("RSA-SHA256");
  signer.update(signedInfo,"utf8");
  signer.end();
  const signatureValue=signer.sign(privateKeyPem,"base64");
  const signature=`<Signature xmlns="${DSIG_NS}">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;
  const signedXml=parsed.documentXml.replace(/<\/eSocial>\s*$/i,`${signature}</eSocial>`);
  return{eventKey:parsed.eventKey,digestValue,signatureValue,signedXml,payloadSha256:createHash("sha256").update(signedXml,"utf8").digest("hex")};
}

export function signEsocialXml(unsignedXml:string){
  const certificatePem=(process.env.ESOCIAL_SIGNING_CERTIFICATE_PEM??process.env.ESOCIAL_CERTIFICATE_PEM)?.replaceAll("\\n","\n").trim();
  const privateKeyPem=(process.env.ESOCIAL_SIGNING_PRIVATE_KEY_PEM??process.env.ESOCIAL_PRIVATE_KEY_PEM)?.replaceAll("\\n","\n").trim();
  if(!certificatePem||!privateKeyPem)throw new Error("Assinatura eSocial exige certificado e chave privada PEM no ambiente seguro do servidor.");
  return signEsocialXmlWithMaterial(unsignedXml,privateKeyPem,certificateBodyFromPem(certificatePem));
}

export function verifyGeneratedEsocialSignature(signedInfo:string,signatureValue:string,publicKeyPem:string){
  const verifier=createVerify("RSA-SHA256");
  verifier.update(signedInfo,"utf8");
  verifier.end();
  return verifier.verify(publicKeyPem,Buffer.from(signatureValue,"base64"));
}
