"use server";

import {randomBytes,randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireCapability} from "@/lib/authorization";
import {reportDataAccessError} from "@/lib/errors/data-access";
import {fileSecurityMessage} from "@/lib/file-security/domain";
import {secureUpload} from "@/lib/file-security/server";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {safeFileName,sha256} from "@/lib/signatures/crypto";
import { campoDeTexto } from "@/lib/forms/campos";

const MAX_ATTACHMENT_SIZE=25*1024*1024;
const ATTACHMENT_MIMES=new Set([
  "application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg","image/webp"
]);

type RequestItemInput={description:string;specification?:string;unit:string;quantity:number;targetUnitPrice?:number|null;notes?:string};
type QuoteItemInput={requestItemId:string;quantity:number;unitPrice:number;brand?:string;offeredSpecification?:string;notes?:string};
type ReceiptItemInput={orderItemId:string;receivedQuantity:number;acceptedQuantity:number;rejectedQuantity:number;notes?:string};
type ProviderLikeError={code?:string|null;statusCode?:string|number|null;name?:string|null};

function text(formData:FormData,key:string){return campoDeTexto(formData, key).trim();}
function optional(formData:FormData,key:string){const value=text(formData,key);return value||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function failData(path:string,operation:string,error:ProviderLikeError|null|undefined,message:string):never{reportDataAccessError(`procurement.${operation}`,error);fail(path,message);}
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
  if(error)failData("/app/compras/fornecedores","create-supplier",error,"Não foi possível cadastrar o fornecedor.");revalidatePath("/app/compras/fornecedores");
}

export async function createProcurementRequest(formData:FormData){
  const projectId=text(formData,"projectId");const context=await requireCapability("compras","create",projectId);let items:RequestItemInput[];
  try{items=parseRequestItems(text(formData,"itemsJson"));}catch(validationError){fail("/app/compras/solicitacoes/nova",validationError instanceof Error?validationError.message:"Itens inválidos.");}
  const title=text(formData,"title");if(!projectId||!title)fail("/app/compras/solicitacoes/nova","Informe obra e título.");
  const{data:request,error}=await context.supabase.from("procurement_requests").insert({organization_id:context.organizationId,project_id:projectId,code:code("SC"),title,description:text(formData,"description"),priority:text(formData,"priority")||"NORMAL",needed_by:optional(formData,"neededBy"),cost_center:optional(formData,"costCenter"),requested_by:context.userId}).select("id").single();
  if(error||!request)failData("/app/compras/solicitacoes/nova","create-request",error,"Não foi possível criar a solicitação.");
  const rows=items.map((item,index)=>({organization_id:context.organizationId,request_id:request.id,line_number:index+1,description:item.description,specification:item.specification??"",unit:item.unit,quantity:item.quantity,target_unit_price:item.targetUnitPrice??null,notes:item.notes??""}));
  const{error:itemsError}=await context.supabase.from("procurement_request_items").insert(rows);
  if(itemsError){
    reportDataAccessError("procurement.create-request-items",itemsError);
    const{error:cleanupError}=await context.supabase.from("procurement_requests").delete().eq("id",request.id);
    reportDataAccessError("procurement.cleanup-request",cleanupError);
    fail("/app/compras/solicitacoes/nova","Não foi possível criar os itens da solicitação.");
  }
  redirect(`/app/compras/solicitacoes/${request.id}`);
}

export async function submitProcurementRequest(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("submit_procurement_request",{p_request_id:requestId});
  if(error)failData(`/app/compras/solicitacoes/${requestId}`,"submit-request",error,"Não foi possível enviar a solicitação.");revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras");
}

export async function createProcurementRfq(formData:FormData){
  const requestId=text(formData,"requestId");const projectId=text(formData,"projectId");const context=await requireCapability("compras","update",projectId);
  const{data,error}=await context.supabase.from("procurement_rfqs").insert({organization_id:context.organizationId,request_id:requestId,code:code("COT"),status:"DRAFT",currency:"BRL",due_at:optional(formData,"dueAt"),terms:text(formData,"terms"),created_by:context.userId}).select("id").single();
  if(error||!data)failData(`/app/compras/solicitacoes/${requestId}`,"create-rfq",error,"Não foi possível criar a cotação.");
  revalidatePath(`/app/compras/solicitacoes/${requestId}`);
}

export async function inviteProcurementSupplier(formData:FormData){
  const requestId=text(formData,"requestId");const rfqId=text(formData,"rfqId");const supplierId=text(formData,"supplierId");const context=await requireCapability("compras","update");
  const token=randomBytes(32).toString("base64url");const expiresAt=optional(formData,"expiresAt");
  const{error}=await context.supabase.from("procurement_supplier_invitations").insert({organization_id:context.organizationId,rfq_id:rfqId,supplier_id:supplierId,token_sha256:sha256(token),expires_at:expiresAt,created_by:context.userId});
  if(error)failData(`/app/compras/solicitacoes/${requestId}`,"invite-supplier",error,"Não foi possível criar o convite do fornecedor.");
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  redirect(`/app/compras/solicitacoes/${requestId}?share=${encodeURIComponent(`${baseUrl}/fornecedores/cotacoes/${token}`)}`);
}

export async function openProcurementRfq(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("open_procurement_rfq",{p_rfq_id:text(formData,"rfqId")});
  if(error)failData(`/app/compras/solicitacoes/${requestId}`,"open-rfq",error,"Não foi possível abrir a cotação.");revalidatePath(`/app/compras/solicitacoes/${requestId}`);
}

export async function submitSupplierProcurementQuote(formData:FormData){
  const token=text(formData,"token");const path=`/fornecedores/cotacoes/${encodeURIComponent(token)}`;const admin=createSupabaseAdminClient();
  const{data:invitation,error:invitationError}=await admin.from("procurement_supplier_invitations").select("*").eq("token_sha256",sha256(token)).single();
  if(invitationError)reportDataAccessError("procurement.public-load-invitation",invitationError);
  if(invitationError||!invitation||invitation.revoked_at||(invitation.expires_at&&new Date(invitation.expires_at).getTime()<Date.now()))fail(path,"Convite expirado ou revogado.");
  const{data:rfq,error:rfqError}=await admin.from("procurement_rfqs").select("*").eq("id",invitation.rfq_id).single();
  if(rfqError)reportDataAccessError("procurement.public-load-rfq",rfqError);
  if(rfqError||!rfq||rfq.status!=="OPEN")fail(path,"A cotação não está aberta.");
  let items:QuoteItemInput[];try{items=parseQuoteItems(text(formData,"itemsJson"));}catch(validationError){fail(path,validationError instanceof Error?validationError.message:"Preços inválidos.");}
  const file=formData.get("attachment");let attachment:Record<string,unknown>={};let uploadedPath:string|null=null;
  if(file instanceof File&&file.size>0){
    if(file.size>MAX_ATTACHMENT_SIZE||!ATTACHMENT_MIMES.has(file.type))fail(path,"Anexo inválido ou superior a 25 MB.");
    const bytes=new Uint8Array(await file.arrayBuffer());uploadedPath=`${invitation.organization_id}/quotes/${rfq.id}/${invitation.supplier_id}/${randomUUID()}-${safeFileName(file.name)}`;
    try{
      await secureUpload({
        targetBucket:"procurement-attachments",targetPath:uploadedPath,body:bytes,
        filename:file.name,contentType:file.type,
        organizationId:invitation.organization_id,actorUserId:invitation.supplier_id,
        correlationId:invitation.id,
        policy:{allowedMimeTypes:ATTACHMENT_MIMES,maxBytes:MAX_ATTACHMENT_SIZE}
      });
    }catch(uploadError){fail(path,fileSecurityMessage(uploadError,{allowedLabel:"PDF, DOCX, XLSX, JPG, PNG ou WebP"}));}
    attachment={attachment_name:file.name,attachment_mime_type:file.type,attachment_size_bytes:file.size,attachment_storage_path:uploadedPath,attachment_sha256:sha256(bytes)};
  }
  const quoteId=randomUUID();const{error:quoteError}=await admin.from("procurement_quotes").insert({id:quoteId,organization_id:invitation.organization_id,rfq_id:rfq.id,supplier_id:invitation.supplier_id,invitation_id:invitation.id,status:"DRAFT",currency:rfq.currency,discount:numberValue(text(formData,"discount")),freight:numberValue(text(formData,"freight")),taxes:numberValue(text(formData,"taxes")),payment_terms:text(formData,"paymentTerms"),lead_time_days:optional(formData,"leadTimeDays")==null?null:numberValue(text(formData,"leadTimeDays")),validity_date:optional(formData,"validityDate"),notes:text(formData,"notes"),...attachment});
  if(quoteError){
    reportDataAccessError("procurement.public-create-quote",quoteError);
    if(uploadedPath){const{error:cleanupError}=await admin.storage.from("procurement-attachments").remove([uploadedPath]);reportDataAccessError("procurement.public-cleanup-quote-artifact",cleanupError);}
    fail(path,"Não foi possível registrar a cotação. Tente novamente.");
  }
  const{error:itemsError}=await admin.from("procurement_quote_items").insert(items.map(item=>({organization_id:invitation.organization_id,quote_id:quoteId,request_item_id:item.requestItemId,quantity:item.quantity,unit_price:item.unitPrice,brand:item.brand??null,offered_specification:item.offeredSpecification??"",notes:item.notes??""})));
  if(itemsError){
    reportDataAccessError("procurement.public-create-quote-items",itemsError);
    const{error:quoteCleanupError}=await admin.from("procurement_quotes").delete().eq("id",quoteId);reportDataAccessError("procurement.public-cleanup-quote",quoteCleanupError);
    if(uploadedPath){const{error:artifactCleanupError}=await admin.storage.from("procurement-attachments").remove([uploadedPath]);reportDataAccessError("procurement.public-cleanup-items-artifact",artifactCleanupError);}
    fail(path,"Não foi possível registrar os itens da cotação. Tente novamente.");
  }
  const{error:submitError}=await admin.rpc("finalize_procurement_quote",{p_quote_id:quoteId});
  if(submitError)failData(path,"public-finalize-quote",submitError,"Não foi possível concluir o envio da cotação. Tente novamente.");
  const{error:accessError}=await admin.rpc("register_procurement_invitation_access",{p_invitation_id:invitation.id});
  reportDataAccessError("procurement.public-register-access",accessError);
  redirect(`${path}?submitted=1`);
}

export async function selectProcurementQuote(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","update");const{error}=await context.supabase.rpc("select_procurement_quote",{p_quote_id:text(formData,"quoteId")});
  if(error)failData(`/app/compras/solicitacoes/${requestId}`,"select-quote",error,"Não foi possível selecionar a cotação.");revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras");
}

export async function decideProcurementApproval(formData:FormData){
  const requestId=text(formData,"requestId");const context=await requireCapability("compras","approve");const decision=text(formData,"decision");
  const{error}=await context.supabase.rpc("decide_procurement_approval",{p_approval_id:text(formData,"approvalId"),p_decision:decision,p_comment:text(formData,"comment")});
  if(error)failData(`/app/compras/solicitacoes/${requestId}`,"decide-approval",error,"Não foi possível registrar a decisão de aprovação.");revalidatePath(`/app/compras/solicitacoes/${requestId}`);revalidatePath("/app/compras/pedidos");
}

export async function createProcurementReceipt(formData:FormData){
  const orderId=text(formData,"orderId");const projectId=text(formData,"projectId");const context=await requireCapability("compras","update",projectId);let items:ReceiptItemInput[];
  try{items=parseReceiptItems(text(formData,"itemsJson"));}catch(validationError){fail(`/app/compras/pedidos/${orderId}`,validationError instanceof Error?validationError.message:"Recebimento inválido.");}
  const admin=createSupabaseAdminClient();const receiptCode=code("REC");
  const{data:receipt,error}=await context.supabase.from("procurement_receipts").insert({organization_id:context.organizationId,project_id:projectId,order_id:orderId,code:receiptCode,status:"DRAFT",invoice_number:optional(formData,"invoiceNumber"),received_by:context.userId,notes:text(formData,"notes")}).select("id").single();
  if(error||!receipt)failData(`/app/compras/pedidos/${orderId}`,"create-receipt",error,"Não foi possível registrar o recebimento.");
  const{error:itemsError}=await context.supabase.from("procurement_receipt_items").insert(items.map(item=>({organization_id:context.organizationId,receipt_id:receipt.id,order_item_id:item.orderItemId,received_quantity:item.receivedQuantity,accepted_quantity:item.acceptedQuantity,rejected_quantity:item.rejectedQuantity,notes:item.notes??""})));
  if(itemsError){
    reportDataAccessError("procurement.create-receipt-items",itemsError);
    const{error:cleanupError}=await context.supabase.from("procurement_receipts").delete().eq("id",receipt.id);reportDataAccessError("procurement.cleanup-receipt",cleanupError);
    fail(`/app/compras/pedidos/${orderId}`,"Não foi possível registrar os itens recebidos.");
  }
  const{error:finalizeError}=await admin.rpc("finalize_procurement_receipt",{p_receipt_id:receipt.id});
  if(finalizeError)failData(`/app/compras/pedidos/${orderId}`,"finalize-receipt",finalizeError,"Não foi possível concluir o recebimento.");
  const{data:fvm,error:fvmError}=await admin.from("quality_form_templates").select("current_version_id").eq("organization_id",context.organizationId).eq("code","FVM-PADRAO").maybeSingle();
  reportDataAccessError("procurement.load-fvm-template",fvmError);
  if(fvm?.current_version_id){
    const{data:assignment,error:assignmentError}=await admin.from("quality_form_assignments").insert({organization_id:context.organizationId,template_version_id:fvm.current_version_id,project_id:projectId,assignee_user_id:context.userId,title:`FVM · ${receiptCode}`,instructions:`Verificação de materiais do pedido ${orderId}.`,status:"OPEN",max_responses:1,created_by:context.userId}).select("id").single();
    reportDataAccessError("procurement.create-fvm-assignment",assignmentError);
    if(assignment){const{error:qualityLinkError}=await admin.from("procurement_receipt_quality").insert({organization_id:context.organizationId,receipt_id:receipt.id,assignment_id:assignment.id});reportDataAccessError("procurement.link-receipt-quality",qualityLinkError);}
  }
  revalidatePath(`/app/compras/pedidos/${orderId}`);revalidatePath("/app/compras/pedidos");revalidatePath("/app/qualidade/preenchimentos");
}
