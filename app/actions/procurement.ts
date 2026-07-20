"use server";

import {randomBytes,randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireCapability} from "@/lib/authorization";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {safeFileName,sha256} from "@/lib/signatures/crypto";

const MAX_ATTACHMENT_SIZE=25*1024*1024;
const ATTACHMENT_MIMES=new Set([
  "application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg","image/webp"
]);

type RequestItemInput={description:string;specification?:string;unit:string;quantity:number;targetUnitPrice?:number|null;notes?:string};
type QuoteItemInput={requestItemId:string;quantity:number;unitPrice:number;brand?:string;offeredSpecification?:string;notes?:string};
type ReceiptItemInput={orderItemId:string;receivedQuantity:number;acceptedQuantity:number;rejectedQuantity:number;notes?:string};

function text(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function optional(formData:FormData,key:string){const value=text(formData,key);return value||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function code(prefix:string){return `${prefix}-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(3).toString("hex").toUpperCase()}`;}
function numberValue(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}

function parseRequestItems(raw:string):RequestItemInput[]{
  const value:unknown=JSON.parse(raw);if(!Array.isArray(value))throw new Error("Itens inválidos.");
  return value.map((item,index)=>{
    if(typeof item!=="object"||item===null)throw new Error(`Item ${index+1} inválido.`);
    const row=item as Record<string,unknown>;const description=String(row.description??"").trim();const unit=String(row.unit??"").trim();const quantity=numberValue(row.quantity);
    if(!description||!unit||quantity<=0)throw new Error(`Preencha descrição, unidade e quantidade do item ${index+1}.`);
    return{description,unit,quantity,specification:String(row.specification??"").trim(),targetUnitPrice:row.targetUnitPrice==null?null:numberValue(row.targetUnitPrice),notes:String(row.notes??"").trim()};
  });
}

function parseQuoteItems(raw:string):QuoteItemInput[]{
  const value:unknown=JSON.parse(raw);if(!Array.isArray(value))throw new Error("Preços inválidos.");
  return value.map((item,index)=>{
    if(typeof item!=="object"||item===null)throw new Error(`Preço ${index+1} inválido.`);
    const row=item as Record<string,unknown>;const requestItemId=String(row.requestItemId??"");const quantity=numberValue(row.quantity);const unitPrice=numberValue(row.unitPrice);
    if(!requestItemId||quantity<=0||unitPrice<0)throw new Error(`Informe quantidade e preço do item ${index+1}.`);
    return{requestItemId,quantity,unitPrice,brand:String(row.brand??"").trim(),offeredSpecification:String(row.offeredSpecification??"").trim(),notes:String(row.notes??"").trim()};
  });
}

function parseReceiptItems(raw:string):ReceiptItemInput[]{
  const value:unknown=JSON.parse(raw);if(!Array.isArray(value))throw new Error("Recebimento inválido.");
  return value.map((item,index)=>{
    if(typeof item!=="object"||item===null)throw new Error(`Item recebido ${index+1} inválido.`);
    const row=item as Record<string,unknown>;const orderItemId=String(row.orderItemId??"");const receivedQuantity=numberValue(row.receivedQuantity);const acceptedQuantity=numberValue(row.acceptedQuantity);const rejectedQuantity=numberValue(row.rejectedQuantity);
    if(!orderItemId||receivedQuantity<=0||acceptedQuantity<0||rejectedQuantity<0||acceptedQuantity+rejectedQuantity>receivedQuantity)throw new Error(`Quantidades inválidas no item ${index+1}.`);
    return{orderItemId,receivedQuantity,acceptedQuantity,rejectedQuantity,notes:String(row.notes??"").trim()};
  });
}

export async function createProcurementSupplier(formData:FormData){
  const context=await requireCapability("compras","create");const legalName=text(formData,"legalName");const email=text(formData,"email").toLowerCase();
  if(!legalName||!email)fail("/app/compras/fornecedores","Informe razão social e e-mail.");
  const categories=text(formData,"categories").split(",").map(item=>item.trim()).filter(Boolean);
  const{error}=await context.supabase.from("procurement_suppliers").insert({organization_id:context.organizationId,legal_name:legalName,trade_name:optional(formData,"tradeName"),tax_id:optional(formData,"taxId"),email,phone:optional(formData,"phone"),categories,status:"INVITED",notes:text(formData,"notes"),invited_at:new Date().toISOString(),created_by:context.userId});
  if(error)fail("/app/compras/fornecedores",error.message);revalidatePath("/app/compras/fornecedores");
}

export async function createProcurementRequest(formData:FormData){
  const projectId=text(formData,"projectId");const context=await requireCapability("compras","create",projectId);let items:RequestItemInput[];
  try{items=parseRequestItems(text(formData,"itemsJson"));}catch(error){fail("/app/compras/solicitacoes/nova",error instanceof Error?error.message:"Itens inválidos.");}
  const title=text(formData,"title");if(!projectId||!title)fail("/app/compras/solicitacoes/nova","Informe obra e título.");
  const{data:request,error}=await context.supabase.from("procurement_requests").insert({organization_id:context.organizationId,project_id:projectId,code:code("SC"),title,description:text(formData,"description"),priority:text(formData,"priority")||"NORMAL",needed_by:optional(formData,"neededBy"),cost_center:optional(formData,"costCenter"),requested_by:context.userId}).select("id").single();
  if(error||!request)fail("/app/compras/solicitacoes/nova",error?.message??"Não foi possível criar a solicitação.");
  const rows=items.map((item,index)=>({organization_id:context.organizationId,request_id:request.id,line_number:index+1,description:item.description,specification:item.specification??"",unit:item.unit,quantity:item.quantity,target_unit_price:item.targetUnitPrice??null,notes:item.notes??""}));
  const{error:itemsError}=await context.supabase.from("procurement_request_items").insert(rows);
  if(itemsError){await context.supabase.from("procurement_requests").delete().eq("id",request.id);fail("/app/compras/solicitacoes/nova",itemsError.message);}
  redirect(`/app/compras/solicitacoes/${request.id}`);
}

export async function submitProcurementRequest(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("submit_procurement_request",{p_request_id:requestId});
  if(error)fail(`/app/compras/solicitacoes/${requestId}`,error.message);revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras");
}

export async function createProcurementRfq(formData:FormData){
  const requestId=text(formData,"requestId");const projectId=text(formData,"projectId");const context=await requireCapability("compras","update",projectId);
  const{data,error}=await context.supabase.from("procurement_rfqs").insert({organization_id:context.organizationId,request_id:requestId,code:code("COT"),status:"DRAFT",currency:"BRL",due_at:optional(formData,"dueAt"),terms:text(formData,"terms"),created_by:context.userId}).select("id").single();
  if(error||!data)fail(`/app/compras/solicitacoes/${requestId}`,error?.message??"Não foi possível criar a cotação.");
  revalidatePath(`/app/compras/solicitacoes/${requestId}`);
}

export async function inviteProcurementSupplier(formData:FormData){
  const requestId=text(formData,"requestId");const rfqId=text(formData,"rfqId");const supplierId=text(formData,"supplierId");const context=await requireCapability("compras","update");
  const token=randomBytes(32).toString("base64url");const expiresAt=optional(formData,"expiresAt");
  const{error}=await context.supabase.from("procurement_supplier_invitations").insert({organization_id:context.organizationId,rfq_id:rfqId,supplier_id:supplierId,token_sha256:sha256(token),expires_at:expiresAt,created_by:context.userId});
  if(error)fail(`/app/compras/solicitacoes/${requestId}`,error.message);
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  redirect(`/app/compras/solicitacoes/${requestId}?share=${encodeURIComponent(`${baseUrl}/fornecedores/cotacoes/${token}`)}`);
}

export async function openProcurementRfq(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("open_procurement_rfq",{p_rfq_id:text(formData,"rfqId")});
  if(error)fail(`/app/compras/solicitacoes/${requestId}`,error.message);revalidatePath(`/app/compras/solicitacoes/${requestId}`);
}

export async function submitSupplierProcurementQuote(formData:FormData){
  const token=text(formData,"token");const path=`/fornecedores/cotacoes/${encodeURIComponent(token)}`;const admin=createSupabaseAdminClient();
  const{data:invitation,error}=await admin.from("procurement_supplier_invitations").select("*").eq("token_sha256",sha256(token)).single();
  if(error||!invitation||invitation.revoked_at||(invitation.expires_at&&new Date(invitation.expires_at).getTime()<Date.now()))fail(path,"Convite expirado ou revogado.");
  const{data:rfq}=await admin.from("procurement_rfqs").select("*").eq("id",invitation.rfq_id).single();if(!rfq||rfq.status!=="OPEN")fail(path,"A cotação não está aberta.");
  let items:QuoteItemInput[];try{items=parseQuoteItems(text(formData,"itemsJson"));}catch(error){fail(path,error instanceof Error?error.message:"Preços inválidos.");}
  const file=formData.get("attachment");let attachment:Record<string,unknown>={};let uploadedPath:string|null=null;
  if(file instanceof File&&file.size>0){
    if(file.size>MAX_ATTACHMENT_SIZE||!ATTACHMENT_MIMES.has(file.type))fail(path,"Anexo inválido ou superior a 25 MB.");
    const bytes=new Uint8Array(await file.arrayBuffer());uploadedPath=`${invitation.organization_id}/quotes/${rfq.id}/${invitation.supplier_id}/${randomUUID()}-${safeFileName(file.name)}`;
    const{error:uploadError}=await admin.storage.from("procurement-attachments").upload(uploadedPath,bytes,{contentType:file.type,upsert:false});if(uploadError)fail(path,uploadError.message);
    attachment={attachment_name:file.name,attachment_mime_type:file.type,attachment_size_bytes:file.size,attachment_storage_path:uploadedPath,attachment_sha256:sha256(bytes)};
  }
  const quoteId=randomUUID();const{error:quoteError}=await admin.from("procurement_quotes").insert({id:quoteId,organization_id:invitation.organization_id,rfq_id:rfq.id,supplier_id:invitation.supplier_id,invitation_id:invitation.id,status:"DRAFT",currency:rfq.currency,discount:numberValue(text(formData,"discount")),freight:numberValue(text(formData,"freight")),taxes:numberValue(text(formData,"taxes")),payment_terms:text(formData,"paymentTerms"),lead_time_days:optional(formData,"leadTimeDays")==null?null:numberValue(text(formData,"leadTimeDays")),validity_date:optional(formData,"validityDate"),notes:text(formData,"notes"),...attachment});
  if(quoteError){if(uploadedPath)await admin.storage.from("procurement-attachments").remove([uploadedPath]);fail(path,quoteError.message);}
  const{error:itemsError}=await admin.from("procurement_quote_items").insert(items.map(item=>({organization_id:invitation.organization_id,quote_id:quoteId,request_item_id:item.requestItemId,quantity:item.quantity,unit_price:item.unitPrice,brand:item.brand??null,offered_specification:item.offeredSpecification??"",notes:item.notes??""})));
  if(itemsError){await admin.from("procurement_quotes").delete().eq("id",quoteId);if(uploadedPath)await admin.storage.from("procurement-attachments").remove([uploadedPath]);fail(path,itemsError.message);}
  const{error:submitError}=await admin.rpc("finalize_procurement_quote",{p_quote_id:quoteId});if(submitError)fail(path,submitError.message);
  await admin.from("procurement_supplier_invitations").update({opened_at:invitation.opened_at??new Date().toISOString(),access_count:Number(invitation.access_count??0)+1}).eq("id",invitation.id);
  redirect(`${path}?submitted=1`);
}

export async function selectProcurementQuote(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("select_procurement_quote",{p_quote_id:text(formData,"quoteId")});
  if(error)fail(`/app/compras/solicitacoes/${requestId}`,error.message);revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras");
}

export async function decideProcurementApproval(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","approve");const decision=text(formData,"decision");
  const{error}=await context.supabase.rpc("decide_procurement_approval",{p_approval_id:text(formData,"approvalId"),p_decision:decision,p_comment:text(formData,"comment")});
  if(error)fail(`/app/compras/solicitacoes/${requestId}`,error.message);revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras/pedidos");
}

export async function createProcurementReceipt(formData:FormData){
  const orderId=text(formData,"orderId");const projectId=text(formData,"projectId");const context=await requireCapability("compras","update",projectId);let items:ReceiptItemInput[];
  try{items=parseReceiptItems(text(formData,"itemsJson"));}catch(error){fail(`/app/compras/pedidos/${orderId}`,error instanceof Error?error.message:"Recebimento inválido.");}
  const admin=createSupabaseAdminClient();const receiptCode=code("REC");
  const{data:receipt,error}=await context.supabase.from("procurement_receipts").insert({organization_id:context.organizationId,project_id:projectId,order_id:orderId,code:receiptCode,status:"DRAFT",invoice_number:optional(formData,"invoiceNumber"),received_by:context.userId,notes:text(formData,"notes")}).select("id").single();
  if(error||!receipt)fail(`/app/compras/pedidos/${orderId}`,error?.message??"Não foi possível registrar o recebimento.");
  const{error:itemsError}=await context.supabase.from("procurement_receipt_items").insert(items.map(item=>({organization_id:context.organizationId,receipt_id:receipt.id,order_item_id:item.orderItemId,received_quantity:item.receivedQuantity,accepted_quantity:item.acceptedQuantity,rejected_quantity:item.rejectedQuantity,notes:item.notes??""})));
  if(itemsError){await context.supabase.from("procurement_receipts").delete().eq("id",receipt.id);fail(`/app/compras/pedidos/${orderId}`,itemsError.message);}
  const{error:finalizeError}=await admin.rpc("finalize_procurement_receipt",{p_receipt_id:receipt.id});if(finalizeError)fail(`/app/compras/pedidos/${orderId}`,finalizeError.message);
  const{data:fvm}=await admin.from("quality_form_templates").select("current_version_id").eq("organization_id",context.organizationId).eq("code","FVM-PADRAO").maybeSingle();
  if(fvm?.current_version_id){
    const{data:assignment}=await admin.from("quality_form_assignments").insert({organization_id:context.organizationId,template_version_id:fvm.current_version_id,project_id:projectId,assignee_user_id:context.userId,title:`FVM · ${receiptCode}`,instructions:`Verificação de materiais do pedido ${orderId}.`,status:"OPEN",max_responses:1,created_by:context.userId}).select("id").single();
    if(assignment)await admin.from("procurement_receipt_quality").insert({organization_id:context.organizationId,receipt_id:receipt.id,assignment_id:assignment.id});
  }
  revalidatePath(`/app/compras/pedidos/${orderId}`);revalidatePath("/app/compras/pedidos");revalidatePath("/app/qualidade/preenchimentos");
}
