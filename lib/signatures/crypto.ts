import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function sha256(input: ArrayBuffer | Uint8Array | Buffer | string) {
  const hash=createHash("sha256");
  if(typeof input==="string")hash.update(input,"utf8");
  else if(input instanceof ArrayBuffer)hash.update(Buffer.from(input));
  else hash.update(input);
  return hash.digest("hex");
}

export function canonicalJson(value: unknown): string {
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;
  const object=value as Record<string,unknown>;
  return `{${Object.keys(object).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

export function hashCanonical(value: unknown){return sha256(canonicalJson(value));}

export function createSigningToken(){
  const token=randomBytes(32).toString("base64url");
  return {token,tokenSha256:sha256(token)};
}

export function safeFileName(name:string){
  const normalized=name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
  const safe=normalized.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  return safe.slice(0,120)||"arquivo";
}
