import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!serviceRole)throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
const supabase=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
const workerId=process.env.SIGNATURE_DELIVERY_WORKER_ID??`delivery-${process.pid}-${randomUUID()}`;
const webhookUrl=process.env.SIGNATURE_EMAIL_WEBHOOK_URL;
const webhookSecret=process.env.SIGNATURE_EMAIL_WEBHOOK_SECRET;

function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

async function complete(id,status,error=null){
  const{error:rpcError}=await supabase.rpc("complete_signature_copy_delivery",{p_delivery_id:id,p_status:status,p_error:error});
  if(rpcError)throw rpcError;
}

async function runOnce(){
  const{data:delivery,error:lockError}=await supabase.rpc("lock_signature_delivery_event",{p_worker_id:workerId});
  if(lockError)throw lockError;
  if(!delivery){console.log(JSON.stringify({ok:true,processed:false,reason:"queue-empty"}));return false;}
  try{
    if(delivery.channel==="PORTAL"){
      await complete(delivery.id,"DELIVERED");
      console.log(JSON.stringify({ok:true,processed:true,deliveryId:delivery.id,channel:"PORTAL"}));
      return true;
    }
    if(!webhookUrl||!webhookSecret)throw new Error("Configure SIGNATURE_EMAIL_WEBHOOK_URL e SIGNATURE_EMAIL_WEBHOOK_SECRET.");
    const{data:signed,error:signedError}=await supabase.storage.from("signature-artifacts").createSignedUrl(delivery.copy_storage_path,3600);
    if(signedError||!signed?.signedUrl)throw signedError??new Error("Não foi possível gerar o link temporário.");
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
    const response=await fetch(webhookUrl,{method:"POST",headers:{"content-type":"application/json","x-innovar-timestamp":timestamp,"x-innovar-signature":signature},body});
    if(!response.ok)throw new Error(`Webhook respondeu HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
    await complete(delivery.id,"SENT");
    console.log(JSON.stringify({ok:true,processed:true,deliveryId:delivery.id,channel:"EMAIL"}));
    return true;
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await complete(delivery.id,"FAILED",message);
    console.error(JSON.stringify({ok:false,deliveryId:delivery.id,error:message}));
    return false;
  }
}

const continuous=process.argv.includes("--continuous");
do{
  const processed=await runOnce();
  if(!continuous||!processed)break;
}while(true);
