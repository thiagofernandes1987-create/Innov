import{createHmac,timingSafeEqual}from"node:crypto";

export const FILE_SECURITY_GATEWAY_PATH="/v1/scan";
export const FILE_SECURITY_GATEWAY_MAX_SKEW_SECONDS=300;

export function buildFileSecurityGatewayPayload(input:{timestamp:string;sha256:string;method?:string;path?:string}){
 return`${input.timestamp}\n${(input.method??"POST").toUpperCase()}\n${input.path??FILE_SECURITY_GATEWAY_PATH}\n${input.sha256.toLowerCase()}`;
}

export function createFileSecurityGatewaySignature(input:{secret:string;timestamp:string;sha256:string;method?:string;path?:string}){
 return createHmac("sha256",input.secret).update(buildFileSecurityGatewayPayload(input)).digest("hex");
}

export function verifyFileSecurityGatewaySignature(input:{secret:string;timestamp:string|null;signature:string|null;sha256:string;nowSeconds?:number;method?:string;path?:string}){
 if(input.secret.length<32||!input.timestamp||!input.signature||!/^[a-f0-9]{64}$/i.test(input.signature))return false;
 const timestamp=Number(input.timestamp);
 const now=input.nowSeconds??Math.floor(Date.now()/1000);
 if(!Number.isInteger(timestamp)||Math.abs(now-timestamp)>FILE_SECURITY_GATEWAY_MAX_SKEW_SECONDS)return false;
 const expected=createFileSecurityGatewaySignature({
  secret:input.secret,timestamp:input.timestamp,sha256:input.sha256,method:input.method,path:input.path
 });
 const left=Buffer.from(expected,"hex");
 const right=Buffer.from(input.signature,"hex");
 return left.length===right.length&&timingSafeEqual(left,right);
}
