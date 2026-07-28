import{createHmac,timingSafeEqual}from"node:crypto";

export const FILE_SECURITY_HEALTH_PATH="/api/internal/file-security/health";
export const FILE_SECURITY_HEALTH_MAX_SKEW_SECONDS=300;

function payload(timestamp:string,method:string,path:string){
 return`${timestamp}\n${method.toUpperCase()}\n${path}`;
}

export function createFileSecurityHealthSignature(secret:string,timestamp:string,method="POST",path=FILE_SECURITY_HEALTH_PATH){
 if(secret.length<32)throw new Error("FILE_SECURITY_HEALTH_SECRET deve possuir ao menos 32 caracteres.");
 return createHmac("sha256",secret).update(payload(timestamp,method,path)).digest("hex");
}

export function verifyFileSecurityHealthSignature(input:{
 secret:string;
 timestamp:string|null;
 signature:string|null;
 method?:string;
 path?:string;
 nowMs?:number;
}){
 const{secret,timestamp,signature}=input;
 if(secret.length<32||!timestamp||!signature||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const parsed=Number(timestamp);
 if(!Number.isInteger(parsed))return false;
 const nowMs=input.nowMs??Date.now();
 if(Math.abs(Math.floor(nowMs/1000)-parsed)>FILE_SECURITY_HEALTH_MAX_SKEW_SECONDS)return false;
 const expected=createFileSecurityHealthSignature(secret,timestamp,input.method,input.path);
 const expectedBuffer=Buffer.from(expected,"hex");
 const receivedBuffer=Buffer.from(signature,"hex");
 return expectedBuffer.length===receivedBuffer.length&&timingSafeEqual(expectedBuffer,receivedBuffer);
}
