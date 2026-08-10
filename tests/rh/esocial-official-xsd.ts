import{generateKeyPairSync}from"node:crypto";
import{existsSync,mkdtempSync,readdirSync,readFileSync,writeFileSync}from"node:fs";
import{tmpdir}from"node:os";
import{join}from"node:path";
import{spawnSync}from"node:child_process";
import{signEsocialXmlWithMaterial}from"@/lib/rh/integrations/esocial-signature-core";

const TEST_KEYS=generateKeyPairSync("rsa",{modulusLength:2048});
const TEST_PRIVATE_KEY=TEST_KEYS.privateKey.export({format:"pem",type:"pkcs8"}).toString();
const TEST_CERT=Buffer.from("INNOVAR-RH-XSD-TEST-CERTIFICATE").toString("base64");
function xsdFiles(root:string):string[]{const out:string[]=[];for(const entry of readdirSync(root,{withFileTypes:true})){const full=join(root,entry.name);if(entry.isDirectory())out.push(...xsdFiles(full));else if(entry.isFile()&&entry.name.toLowerCase().endsWith(".xsd"))out.push(full);}return out;}

export function validateWithOfficialEsocialXsd(xml:string,label:string){
 const root=process.env.ESOCIAL_XSD_DIR;
 // A obrigatoriedade deixou de ser "está no CI" e passou a ser "este job se
 // comprometeu a provisionar". A regra antiga reprovava o `quality` genérico,
 // que nunca prometeu baixar o pacote XSD oficial nem instalar o `xmllint` —
 // e reprovar um job por não fazer o que ele não se propôs a fazer não mede
 // nada: só ensina a ignorar vermelho. Quem provisiona é o
 // `rh-esocial-generation.yml`, e é ele que declara ESOCIAL_GATES_OBRIGATORIOS.
 // Assim, apagar o provisionamento de lá continua reprovando, que é a garantia
 // que a regra antiga queria dar.
 if(!root){
  if(process.env.ESOCIAL_GATES_OBRIGATORIOS==="1"){
   throw new Error(`${label}: ESOCIAL_XSD_DIR é obrigatório neste job — ele declara ESOCIAL_GATES_OBRIGATORIOS=1.`);
  }
  console.log(`${label}: XSD oficial ausente (ESOCIAL_XSD_DIR não definida); conferência de esquema não executada.`);
  return;
 }
 if(!existsSync(root))throw new Error(`${label}: diretório XSD oficial inexistente: ${root}`);
 const namespace=xml.match(/<eSocial\s+xmlns="([^"]+)"/)?.[1];if(!namespace)throw new Error(`${label}: namespace raiz eSocial ausente.`);
 const schemas=xsdFiles(root).filter(file=>readFileSync(file,"utf8").includes(`targetNamespace="${namespace}"`));
 if(schemas.length!==1)throw new Error(`${label}: esperado 1 XSD oficial para ${namespace}, encontrados ${schemas.length}.`);
 const signedXml=xml.includes("<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">")?xml:signEsocialXmlWithMaterial(xml,TEST_PRIVATE_KEY,TEST_CERT).signedXml;
 const dir=mkdtempSync(join(tmpdir(),"innov-esocial-xsd-"));const xmlFile=join(dir,`${label.replace(/[^A-Za-z0-9_-]/g,"_")}.xml`);writeFileSync(xmlFile,signedXml,"utf8");
 const result=spawnSync("xmllint",["--noout","--schema",schemas[0],xmlFile],{encoding:"utf8"});
 if(result.error)throw new Error(`${label}: falha ao executar xmllint: ${result.error.message}`);
 if(result.status!==0)throw new Error(`${label}: XML assinado rejeitado pelo XSD oficial ${schemas[0]}.\n${result.stderr||result.stdout}`);
}
