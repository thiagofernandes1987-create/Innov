import{mkdtempSync,readdirSync,readFileSync,writeFileSync}from"node:fs";
import{tmpdir}from"node:os";
import{join}from"node:path";
import{spawnSync}from"node:child_process";

function xsdFiles(root:string):string[]{const out:string[]=[];for(const entry of readdirSync(root,{withFileTypes:true})){const full=join(root,entry.name);if(entry.isDirectory())out.push(...xsdFiles(full));else if(entry.isFile()&&entry.name.toLowerCase().endsWith(".xsd"))out.push(full);}return out;}

export function validateWithOfficialEsocialXsd(xml:string,label:string){
 const root=process.env.ESOCIAL_XSD_DIR;if(!root)return;
 const namespace=xml.match(/<eSocial\s+xmlns="([^"]+)"/)?.[1];if(!namespace)throw new Error(`${label}: namespace raiz eSocial ausente.`);
 const schemas=xsdFiles(root).filter(file=>readFileSync(file,"utf8").includes(`targetNamespace="${namespace}"`));
 if(schemas.length!==1)throw new Error(`${label}: esperado 1 XSD oficial para ${namespace}, encontrados ${schemas.length}.`);
 const dir=mkdtempSync(join(tmpdir(),"innov-esocial-xsd-"));const xmlFile=join(dir,`${label.replace(/[^A-Za-z0-9_-]/g,"_")}.xml`);writeFileSync(xmlFile,xml,"utf8");
 const result=spawnSync("xmllint",["--noout","--schema",schemas[0],xmlFile],{encoding:"utf8"});
 if(result.status!==0)throw new Error(`${label}: XML rejeitado pelo XSD oficial ${schemas[0]}.\n${result.stderr||result.stdout}`);
}
