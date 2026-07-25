import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { canonicalJson, safeFileName } from "@/lib/signatures/format";

export { canonicalJson, safeFileName };

export function sha256(input: ArrayBuffer | Uint8Array | Buffer | string) {
  const hash=createHash("sha256");
  if(typeof input==="string")hash.update(input,"utf8");
  else if(input instanceof ArrayBuffer)hash.update(Buffer.from(input));
  else hash.update(input);
  return hash.digest("hex");
}

export function hashCanonical(value: unknown){return sha256(canonicalJson(value));}

export function createSigningToken(){
  const token=randomBytes(32).toString("base64url");
  return {token,tokenSha256:sha256(token)};
}

