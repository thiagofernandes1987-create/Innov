import "server-only";

import { X509Certificate } from "node:crypto";
import { signEsocialXmlWithMaterial } from "./esocial-signature-core";

function certificateBodyFromPem(pem:string){
  const cert=new X509Certificate(pem);
  return cert.raw.toString("base64");
}

export function signEsocialXml(unsignedXml:string){
  const certificatePem=(process.env.ESOCIAL_SIGNING_CERTIFICATE_PEM??process.env.ESOCIAL_CERTIFICATE_PEM)?.replaceAll("\\n","\n").trim();
  const privateKeyPem=(process.env.ESOCIAL_SIGNING_PRIVATE_KEY_PEM??process.env.ESOCIAL_PRIVATE_KEY_PEM)?.replaceAll("\\n","\n").trim();
  if(!certificatePem||!privateKeyPem)throw new Error("Assinatura eSocial exige certificado e chave privada PEM no ambiente seguro do servidor.");
  return signEsocialXmlWithMaterial(unsignedXml,privateKeyPem,certificateBodyFromPem(certificatePem));
}
