import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!serviceRole)throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
const supabase=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
const workerId=process.env.SIGNATURE_DELIVERY_WORKER_ID??`delivery-${process.pid}-${randomUUID()}`;
const webhookUrl=process.env.SIGNATURE_EMAIL_WEBHOOK_URL;
const webhookSecret=process.env.SIGNATURE_EMAIL_WEBHOOK_SECRET;

class DeliveryWorkerFailure extends Error{
  constructor(code){super(code);this.code=code;}
}
function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function stableIdentifier(value){
  if(typeof value==="number"&&Number.isFinite(value))return String(value);
  if(typeof value!=="string")return null;
  const normalized=value.trim().toUpperCase();
  return /^[A-Z0-9_.:-]{1,60}$/.test(normalized)?normalized:null;
}
function failureCode(stage,error){
  const provider=error&&typeof error==="object"
    ?stableIdentifier(error.code)??stableIdentifier(error.statusCode)??stableIdentifier(error.name)
    :null;
  if(!provider||provider==="ERROR")return stage;
  const combined=`${stage}:${provider}`;
  return combined.length<=120?combined:stage;
}
function logFailure(event,fields={}){console.error(JSON.stringify({ok:false,event,...fields}));}

async function complete(id,status,errorCode=null){
  const{error:rpcError}=await supabase.rpc("complete_signature_copy_delivery",{p_delivery_id:id,p_status:status,p_error:errorCode});
  if(rpcError)throw rpcError;
}

async function runOnce(){
  const{data:delivery,error:lockError}=await supabase.rpc("lock_signature_delivery_event",{p_worker_id:workerId});
  if(lockError){logFailure("signature_delivery_lock_failed",{errorCode:failureCode("DELIVERY_LOCK_FAILED",lockError)});return false;}
  if(!delivery){console.log(JSON.stringify({ok:true,processed:false,reason:"queue-empty"}));return false;}
  let stage="DELIVERY_FAILED";
  try{
    if(delivery.channel==="PORTAL"){
      stage="DELIVERY_COMPLETE_FAILED";
      await complete(delivery.id,"DELIVERED");
      console.log(JSON.stringify({ok:true,processed:true,deliveryId:delivery.id,channel:"PORTAL"}));
      return true;
    }
    if(!webhookUrl||!webhookSecret)throw new DeliveryWorkerFailure("DELIVERY_CONFIGURATION_MISSING");

    stage="DELIVERY_SIGNED_URL_FAILED";
    const{data:signed,error:signedError}=await supabase.storage.from("signature-artifacts").createSignedUrl(delivery.copy_storage_path,3600);
    if(signedError||!signed?.signedUrl)throw signedError??new DeliveryWorkerFailure("DELIVERY_SIGNED_URL_MISSING");

    const payload={
      event:"signature.copy.ready",
      deliveryId:delivery.id,
      envelopeId:delivery.envelope_id,
      recipientEmail:delivery.recipient_email,
      downloadUrl:signed.signedUrl,
      copySha256:delivery.copy_sha256,
      expiresInSeconds:3600
    };
    const timestamp=Date.now().toString();
    const body=canonical(payload);
    const signature=createHmac("sha256",webhookSecret).update(`${timestamp}.${body}`).digest("hex");

    stage="DELIVERY_EMAIL_PROVIDER_FAILED";
    const response=await fetch(webhookUrl,{method:"POST",headers:{"content-type":"application/json","x-innovar-timestamp":timestamp,"x-innovar-signature":signature},body});
    if(!response.ok)throw new DeliveryWorkerFailure(`EMAIL_WEBHOOK_HTTP_${response.status}`);

    stage="DELIVERY_COMPLETE_FAILED";
    await complete(delivery.id,"SENT");
    console.log(JSON.stringify({ok:true,processed:true,deliveryId:delivery.id,channel:"EMAIL"}));
    return true;
  }catch(error){
    const errorCode=error instanceof DeliveryWorkerFailure?error.code:failureCode(stage,error);
    try{
      await complete(delivery.id,"FAILED",errorCode);
    }catch(recordError){
      logFailure("signature_delivery_failure_record_failed",{deliveryId:delivery.id,errorCode:failureCode("DELIVERY_FAILURE_RECORD_FAILED",recordError)});
    }
    logFailure("signature_delivery_failed",{deliveryId:delivery.id,errorCode});
    return false;
  }
}

const continuous=process.argv.includes("--continuous");
do{
  const processed=await runOnce();
  if(!continuous||!processed)break;
}while(true);
