import { createHash, createSign, createVerify } from "node:crypto";

export const ESOCIAL_DSIG_NS="http://www.w3.org/2000/09/xmldsig#";
export const ESOCIAL_C14N="http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
export const ESOCIAL_RSA_SHA256="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
export const ESOCIAL_SHA256="http://www.w3.org/2001/04/xmlenc#sha256";
export const ESOCIAL_ENVELOPED="http://www.w3.org/2000/09/xmldsig#enveloped-signature";

function compact(value:string){return value.trim().replace(/^<\?xml[^>]*>\s*/i,"");}
function b64Sha256(value:string){return createHash("sha256").update(value,"utf8").digest("base64");}

export function extractEsocialSignableElement(unsignedXml:string){
  const xml=compact(unsignedXml);
  if(!/^<eSocial\b/.test(xml))throw new Error("XML eSocial inválido: raiz eSocial ausente.");
  if(/<Signature\b/.test(xml))throw new Error("XML já contém Signature; não é permitido assinar novamente.");
  const match=xml.match(/<([A-Za-z0-9_:-]+)\b([^>]*\bId=["'](ID[^"']+)["'][^>]*)>[\s\S]*?<\/\1>/);
  if(!match)throw new Error("Elemento de evento com atributo Id não encontrado.");
  return{eventKey:match[3],eventXml:match[0],documentXml:xml};
}

export function buildSignedInfo(eventKey:string,digestValue:string){
  return `<SignedInfo xmlns="${ESOCIAL_DSIG_NS}"><CanonicalizationMethod Algorithm="${ESOCIAL_C14N}"></CanonicalizationMethod><SignatureMethod Algorithm="${ESOCIAL_RSA_SHA256}"></SignatureMethod><Reference URI="#${eventKey}"><Transforms><Transform Algorithm="${ESOCIAL_ENVELOPED}"></Transform><Transform Algorithm="${ESOCIAL_C14N}"></Transform></Transforms><DigestMethod Algorithm="${ESOCIAL_SHA256}"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
}

export function signEsocialXmlWithMaterial(unsignedXml:string,privateKeyPem:string,certificateBase64:string){
  const parsed=extractEsocialSignableElement(unsignedXml);
  const digestValue=b64Sha256(parsed.eventXml);
  const signedInfo=buildSignedInfo(parsed.eventKey,digestValue);
  const signer=createSign("RSA-SHA256");
  signer.update(signedInfo,"utf8");
  signer.end();
  const signatureValue=signer.sign(privateKeyPem,"base64");
  const signature=`<Signature xmlns="${ESOCIAL_DSIG_NS}">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;
  const signedXml=parsed.documentXml.replace(/<\/eSocial>\s*$/i,`${signature}</eSocial>`);
  return{eventKey:parsed.eventKey,digestValue,signatureValue,signedInfo,signedXml,payloadSha256:createHash("sha256").update(signedXml,"utf8").digest("hex")};
}

export function verifyGeneratedEsocialSignature(signedInfo:string,signatureValue:string,publicKeyPem:string){
  const verifier=createVerify("RSA-SHA256");
  verifier.update(signedInfo,"utf8");
  verifier.end();
  return verifier.verify(publicKeyPem,Buffer.from(signatureValue,"base64"));
}
