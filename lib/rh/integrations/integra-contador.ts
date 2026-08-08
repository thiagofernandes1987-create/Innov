import"server-only";

const DEFAULT_PRODUCTION="https://gateway.apiserpro.serpro.gov.br";
const DEFAULT_VALIDATION="https://gateway-val.apiserpro.serpro.gov.br";
const ALLOWED_HOSTS=new Set(["gateway.apiserpro.serpro.gov.br","gateway-val.apiserpro.serpro.gov.br"]);

export type IntegraContadorEnvironment="VALIDATION"|"PRODUCTION";
export type IntegraContadorToken={accessToken:string;tokenType:string;expiresIn:number;scope?:string};
export type IntegraContadorResponse<T>={status:number;headers:Headers;data:T;correlationId:string};

function envBase(environment:IntegraContadorEnvironment){const configured=(environment==="PRODUCTION"?process.env.INTEGRA_CONTADOR_BASE_URL:process.env.INTEGRA_CONTADOR_VALIDATION_BASE_URL)?.trim();return configured||(environment==="PRODUCTION"?DEFAULT_PRODUCTION:DEFAULT_VALIDATION);}
function safeBase(environment:IntegraContadorEnvironment){const url=new URL(envBase(environment));if(url.protocol!=="https:"||!ALLOWED_HOSTS.has(url.hostname)||url.username||url.password||url.search||url.hash)throw new Error("Host Integra Contador/SERPRO não permitido.");return url.origin;}
function pathOnly(path:string){if(!path.startsWith("/")||path.startsWith("//")||path.includes("\\")||/[\r\n]/.test(path))throw new Error("Path de serviço Integra Contador inválido.");const u=new URL(path,"https://local.invalid");if(u.origin!=="https://local.invalid")throw new Error("Path externo não permitido.");return`${u.pathname}${u.search}`;}
function timeoutMs(){const raw=Number(process.env.INTEGRA_CONTADOR_TIMEOUT_MS??"20000");return Number.isFinite(raw)&&raw>=1000&&raw<=120000?raw:20000;}
function credentials(){const key=process.env.INTEGRA_CONTADOR_CONSUMER_KEY?.trim(),secret=process.env.INTEGRA_CONTADOR_CONSUMER_SECRET?.trim();if(!key||!secret)throw new Error("Credenciais contratadas do Integra Contador não configuradas.");return{key,secret};}

export async function getIntegraContadorToken(environment:IntegraContadorEnvironment="VALIDATION"):Promise<IntegraContadorToken>{
 const base=safeBase(environment),{key,secret}=credentials(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs());
 try{const response=await fetch(`${base}/token`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body:"grant_type=client_credentials",signal:controller.signal,cache:"no-store"});const text=await response.text();let payload:Record<string,unknown>={};try{payload=text?JSON.parse(text):{};}catch{payload={};}if(!response.ok)throw new Error(`SERPRO_TOKEN_${response.status}`);const access=String(payload.access_token??"");if(!access)throw new Error("SERPRO_TOKEN_WITHOUT_ACCESS_TOKEN");return{accessToken:access,tokenType:String(payload.token_type??"Bearer"),expiresIn:Number(payload.expires_in??0),scope:payload.scope?String(payload.scope):undefined};}catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw new Error("SERPRO_TOKEN_TIMEOUT");throw error;}finally{clearTimeout(timer);}
}

export async function callIntegraContador<T>(input:{environment?:IntegraContadorEnvironment;path:string;method?:"GET"|"POST"|"PUT"|"DELETE";body?:unknown;headers?:Record<string,string>;correlationId?:string}):Promise<IntegraContadorResponse<T>>{
 const environment=input.environment??"VALIDATION";if(environment==="PRODUCTION"&&process.env.INTEGRA_CONTADOR_ENABLE_PRODUCTION!=="true")throw new Error("INTEGRA_CONTADOR_PRODUCTION_DISABLED");const base=safeBase(environment),path=pathOnly(input.path),token=await getIntegraContadorToken(environment),correlationId=input.correlationId?.trim()||crypto.randomUUID(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs());
 try{const response=await fetch(`${base}${path}`,{method:input.method??(input.body===undefined?"GET":"POST"),headers:{Authorization:`${token.tokenType||"Bearer"} ${token.accessToken}`,Accept:"application/json","Content-Type":"application/json","X-Correlation-Id":correlationId,...input.headers},body:input.body===undefined?undefined:JSON.stringify(input.body),signal:controller.signal,cache:"no-store"});const text=await response.text();let data:unknown=text;const contentType=response.headers.get("content-type")??"";if(contentType.includes("json")&&text){try{data=JSON.parse(text);}catch{data={raw:text};}}if(!response.ok){const code=response.status===401?"AUTH":response.status===403?"FORBIDDEN":response.status===429?"RATE_LIMIT":response.status>=500?"UPSTREAM":"REQUEST";throw new Error(`INTEGRA_CONTADOR_${code}_${response.status}`);}return{status:response.status,headers:response.headers,data:data as T,correlationId};}catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw new Error("INTEGRA_CONTADOR_TIMEOUT");throw error;}finally{clearTimeout(timer);}
}

export function getConfiguredIntegraContadorServices(){return{dctfwebEventsPath:process.env.INTEGRA_CONTADOR_DCTFWEB_EVENTS_PATH?.trim()||null,dctfwebServicePath:process.env.INTEGRA_CONTADOR_DCTFWEB_SERVICE_PATH?.trim()||null};}
