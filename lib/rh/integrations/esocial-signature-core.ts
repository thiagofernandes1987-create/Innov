import { createHash, createSign, createVerify } from "node:crypto";

export const ESOCIAL_DSIG_NS="http://www.w3.org/2000/09/xmldsig#";
export const ESOCIAL_C14N="http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
export const ESOCIAL_RSA_SHA256="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
export const ESOCIAL_SHA256="http://www.w3.org/2001/04/xmlenc#sha256";
export const ESOCIAL_ENVELOPED="http://www.w3.org/2000/09/xmldsig#enveloped-signature";

function compact(value:string){return value.trim().replace(/^<\?xml[^>]*>\s*/i,"").replace(/\r\n?/g,"\n");}
function b64Sha256(value:string){return createHash("sha256").update(value,"utf8").digest("base64");}
function parseAttributes(raw:string){
 const attrs:Array<{name:string;value:string}>=[];let rest=raw;
 const re=/^\s+([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;
 while(rest.trim()){const match=rest.match(re);if(!match)throw new Error(`XML eSocial usa atributo não suportado pela canonicalização: ${rest.trim().slice(0,80)}`);const value=match[2]??match[3]??"";if(/[\t\r\n]/.test(value))throw new Error("XML eSocial usa whitespace de controle em atributo; normalize antes de assinar.");attrs.push({name:match[1],value});rest=rest.slice(match[0].length);}
 return attrs;
}
function canonicalStartTag(tag:string,rawAttrs:string,selfClosing:boolean,defaultNamespace?:string){
 const attrs=parseAttributes(rawAttrs);if(defaultNamespace&&!attrs.some(a=>a.name==="xmlns"))attrs.push({name:"xmlns",value:defaultNamespace});
 const namespaces=attrs.filter(a=>a.name==="xmlns"||a.name.startsWith("xmlns:")).sort((a,b)=>a.name.localeCompare(b.name));
 const regular=attrs.filter(a=>a.name!=="xmlns"&&!a.name.startsWith("xmlns:")).sort((a,b)=>a.name.localeCompare(b.name));
 const serialized=[...namespaces,...regular].map(a=>` ${a.name}="${a.value}"`).join("");
 return selfClosing?`<${tag}${serialized}></${tag}>`:`<${tag}${serialized}>`;
}
function canonicalizeGeneratedFragment(xml:string,defaultNamespace?:string){
 const normalized=compact(xml);if(/<!--|<!\[CDATA\[|<!DOCTYPE|<\?/.test(normalized))throw new Error("XML eSocial contém construção não suportada pelo signer determinístico.");let first=true;
 return normalized.replace(/<([A-Za-z_][A-Za-z0-9_.:-]*)([^<>]*?)(\/?)>/g,(full,tag:string,attrs:string,slash:string)=>{if(full.startsWith("</"))return full;const result=canonicalStartTag(tag,attrs,slash==="/",first?defaultNamespace:undefined);first=false;return result;});
}

export function extractEsocialSignableElement(unsignedXml:string){
  const xml=compact(unsignedXml);
  const root=xml.match(/^<eSocial\b([^>]*)>/);if(!root)throw new Error("XML eSocial inválido: raiz eSocial ausente.");
  const rootAttrs=parseAttributes(root[1]);const rootNamespace=rootAttrs.find(a=>a.name==="xmlns")?.value;if(!rootNamespace)throw new Error("XML eSocial inválido: namespace padrão da raiz ausente.");
  if(/<Signature\b/.test(xml))throw new Error("XML já contém Signature; não é permitido assinar novamente.");
  const match=xml.match(/<([A-Za-z0-9_:-]+)\b([^>]*\bId=["'](ID[^"']+)["'][^>]*)>[\s\S]*?<\/\1>/);
  if(!match)throw new Error("Elemento de evento com atributo Id não encontrado.");
  return{eventKey:match[3],eventXml:match[0],documentXml:xml,rootNamespace,eventTag:match[1]};
}

export function canonicalizeEsocialSignableElement(unsignedXml:string){const parsed=extractEsocialSignableElement(unsignedXml);return{...parsed,canonicalEventXml:canonicalizeGeneratedFragment(parsed.eventXml,parsed.rootNamespace)};}

export function buildSignedInfo(eventKey:string,digestValue:string){
  return `<SignedInfo xmlns="${ESOCIAL_DSIG_NS}"><CanonicalizationMethod Algorithm="${ESOCIAL_C14N}"></CanonicalizationMethod><SignatureMethod Algorithm="${ESOCIAL_RSA_SHA256}"></SignatureMethod><Reference URI="#${eventKey}"><Transforms><Transform Algorithm="${ESOCIAL_ENVELOPED}"></Transform><Transform Algorithm="${ESOCIAL_C14N}"></Transform></Transforms><DigestMethod Algorithm="${ESOCIAL_SHA256}"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
}

export function signEsocialXmlWithMaterial(unsignedXml:string,privateKeyPem:string,certificateBase64:string){
  const parsed=canonicalizeEsocialSignableElement(unsignedXml);
  const digestValue=b64Sha256(parsed.canonicalEventXml);
  const signedInfo=buildSignedInfo(parsed.eventKey,digestValue);
  const signer=createSign("RSA-SHA256");
  signer.update(signedInfo,"utf8");
  signer.end();
  const signatureValue=signer.sign(privateKeyPem,"base64");
  const signature=`<Signature xmlns="${ESOCIAL_DSIG_NS}">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;
  const signedXml=parsed.documentXml.replace(/<\/eSocial>\s*$/i,`${signature}</eSocial>`);
  return{eventKey:parsed.eventKey,digestValue,signatureValue,signedInfo,signedXml,canonicalEventXml:parsed.canonicalEventXml,payloadSha256:createHash("sha256").update(signedXml,"utf8").digest("hex")};
}

export function verifyGeneratedEsocialSignature(signedInfo:string,signatureValue:string,publicKeyPem:string){
  const verifier=createVerify("RSA-SHA256");
  verifier.update(signedInfo,"utf8");
  verifier.end();
  return verifier.verify(publicKeyPem,Buffer.from(signatureValue,"base64"));
}
