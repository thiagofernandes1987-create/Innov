import {notFound} from "next/navigation";
import {SupplierQuoteForm} from "@/components/procurement/supplier-quote-form";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {sha256} from "@/lib/signatures/crypto";

export const dynamic="force-dynamic";

export default async function SupplierQuotationPage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{error?:string;submitted?:string}>}){
  const{token}=await params;const query=await searchParams;const admin=createSupabaseAdminClient();
  const{data:invitation,error}=await admin.from("procurement_supplier_invitations").select("*").eq("token_sha256",sha256(token)).is("revoked_at",null).or("expires_at.is.null,expires_at.gt.now()").single();
  if(error||!invitation)notFound();
  const[{data:rfq},{data:supplier}]=await Promise.all([
    admin.from("procurement_rfqs").select("*,procurement_requests(id,code,title,description,project_id,projects(name,code))").eq("id",invitation.rfq_id).single(),
    admin.from("procurement_suppliers").select("legal_name,trade_name,email").eq("id",invitation.supplier_id).single()
  ]);
  if(!rfq||rfq.status!=="OPEN")notFound();
  const request=Array.isArray(rfq.procurement_requests)?rfq.procurement_requests[0]:rfq.procurement_requests;
  const{data:items}=await admin.from("procurement_request_items").select("id,description,specification,unit,quantity").eq("request_id",request.id).order("line_number");
  if(!invitation.opened_at)await admin.from("procurement_supplier_invitations").update({opened_at:new Date().toISOString(),access_count:Number(invitation.access_count??0)+1}).eq("id",invitation.id);
  return <main className="procurement-public-page"><header className="procurement-public-header"><div><span className="badge">COTAÇÃO · {rfq.code}</span><h1>{request.title}</h1><p>{request.code} · {request.description||"Solicitação de proposta comercial"}</p></div><div><small>FORNECEDOR CONVIDADO</small><strong>{supplier?.trade_name||supplier?.legal_name}</strong></div></header>{query.error&&<div className="validation blocking">{query.error}</div>}{query.submitted?<section className="card card-pad procurement-success"><span>✓</span><h2>Proposta enviada</h2><p>A Innovar recebeu sua cotação. Este link não aceita uma segunda proposta.</p></section>:<><section className="procurement-public-summary"><article><small>OBRA</small><strong>{request.projects?.name??"Obra Innovar"}</strong></article><article><small>PRAZO PARA RESPOSTA</small><strong>{rfq.due_at?new Date(rfq.due_at).toLocaleString("pt-BR"):"Sem prazo definido"}</strong></article><article><small>MOEDA</small><strong>{rfq.currency}</strong></article></section>{rfq.terms&&<section className="card card-pad"><span className="eyebrow">CONDIÇÕES</span><p>{rfq.terms}</p></section>}<SupplierQuoteForm token={token} currency={rfq.currency} items={(items??[]).map(item=>({...item,quantity:Number(item.quantity)}))}/></>}</main>;
}
