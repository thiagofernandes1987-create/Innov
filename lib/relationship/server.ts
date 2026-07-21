import"server-only";
import{requireCapability}from"@/lib/authorization";
import{requireClientContext}from"@/lib/auth";
import{normalizeClient360,normalizeCrmPipeline,normalizeSacDashboard,normalizeSacTicketDetail}from"@/lib/relationship/domain";

export async function loadCrmDashboard(){
 const context=await requireCapability("crm","read");
 const[pipelineResult,leadsResult,opportunitiesResult,activitiesResult]=await Promise.all([
  context.supabase.rpc("get_crm_pipeline",{p_organization_id:context.organizationId}),
  context.supabase.from("crm_leads").select("id,code,stage,full_name,company_name,email,phone,source,interest,estimated_budget,owner_id,next_follow_up_at,created_at").eq("organization_id",context.organizationId).is("archived_at",null).order("created_at",{ascending:false}).limit(100),
  context.supabase.from("opportunities").select("id,code,client_id,lead_id,title,stage,estimated_value,probability,expected_close_date,owner_id,created_at").eq("organization_id",context.organizationId).is("archived_at",null).order("created_at",{ascending:false}).limit(100),
  context.supabase.from("crm_activities").select("id,activity_type,subject,description,lead_id,opportunity_id,client_id,ticket_id,occurred_at,due_at,completed_at,owner_id").eq("organization_id",context.organizationId).is("completed_at",null).order("due_at",{ascending:true,nullsFirst:false}).limit(50)
 ]);
 if(pipelineResult.error)throw new Error(pipelineResult.error.message);
 return{context,pipeline:normalizeCrmPipeline(pipelineResult.data),leads:leadsResult.data??[],opportunities:opportunitiesResult.data??[],activities:activitiesResult.data??[],errors:[leadsResult.error,opportunitiesResult.error,activitiesResult.error].filter(Boolean).map(error=>error?.message)};
}

export async function loadLead(id:string){
 const context=await requireCapability("crm","read");
 const[leadResult,activitiesResult]=await Promise.all([
  context.supabase.from("crm_leads").select("*").eq("id",id).eq("organization_id",context.organizationId).maybeSingle(),
  context.supabase.from("crm_activities").select("*").eq("lead_id",id).eq("organization_id",context.organizationId).order("occurred_at",{ascending:false})
 ]);
 if(leadResult.error||!leadResult.data)throw new Error(leadResult.error?.message??"Lead não encontrado.");
 return{context,lead:leadResult.data,activities:activitiesResult.data??[]};
}

export async function loadOpportunity(id:string){
 const context=await requireCapability("crm","read");
 const[opportunityResult,historyResult,activitiesResult]=await Promise.all([
  context.supabase.from("opportunities").select("*").eq("id",id).eq("organization_id",context.organizationId).maybeSingle(),
  context.supabase.from("crm_opportunity_stage_history").select("*").eq("opportunity_id",id).eq("organization_id",context.organizationId).order("changed_at",{ascending:false}),
  context.supabase.from("crm_activities").select("*").eq("opportunity_id",id).eq("organization_id",context.organizationId).order("occurred_at",{ascending:false})
 ]);
 if(opportunityResult.error||!opportunityResult.data)throw new Error(opportunityResult.error?.message??"Oportunidade não encontrada.");
 return{context,opportunity:opportunityResult.data,history:historyResult.data??[],activities:activitiesResult.data??[]};
}

export async function loadClientDirectory(query?:string|null){
 const context=await requireCapability("clientes","read");
 let builder=context.supabase.from("clients").select("id,type,legal_name,trade_name,email,phone,status,city,state,lifecycle_stage,source,last_contact_at,next_follow_up_at,created_at").eq("organization_id",context.organizationId).is("archived_at",null).order("legal_name");
 if(query?.trim())builder=builder.or(`legal_name.ilike.%${query.trim()}%,trade_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`);
 const{data,error}=await builder.limit(200);if(error)throw new Error(error.message);return{context,clients:data??[],query:query??""};
}

export async function loadClient360(id:string){
 const context=await requireCapability("clientes","read");
 const{data,error}=await context.supabase.rpc("get_client_360",{p_client_id:id});
 if(error)throw new Error(error.message);return{context,client360:normalizeClient360(data)};
}

export async function loadSacDashboard(){
 const context=await requireCapability("sac","read");
 const[dashboardResult,ticketsResult,categoriesResult]=await Promise.all([
  context.supabase.rpc("get_sac_dashboard",{p_organization_id:context.organizationId}),
  context.supabase.from("sac_tickets").select("id,code,client_id,project_id,category_id,title,source,priority,status,assigned_to,first_response_due_at,resolution_due_at,created_at,updated_at,clients:client_id(legal_name,trade_name),projects:project_id(code,name),sac_categories:category_id(name)").eq("organization_id",context.organizationId).order("created_at",{ascending:false}).limit(200),
  context.supabase.from("sac_categories").select("id,code,name,default_priority,first_response_sla_hours,resolution_sla_hours,active").eq("organization_id",context.organizationId).eq("active",true).order("name")
 ]);
 if(dashboardResult.error)throw new Error(dashboardResult.error.message);
 return{context,dashboard:normalizeSacDashboard(dashboardResult.data),tickets:ticketsResult.data??[],categories:categoriesResult.data??[]};
}

export async function loadSacTicket(id:string){
 const context=await requireCapability("sac","read");
 const{data,error}=await context.supabase.rpc("get_sac_ticket_detail",{p_ticket_id:id});
 if(error)throw new Error(error.message);return{context,detail:normalizeSacTicketDetail(data)};
}

export async function loadRelationshipOptions(){
 const context=await requireCapability("clientes","read");
 const[clientsResult,projectsResult,categoriesResult,membersResult]=await Promise.all([
  context.supabase.from("clients").select("id,legal_name,trade_name").eq("organization_id",context.organizationId).is("archived_at",null).order("legal_name"),
  context.supabase.from("projects").select("id,client_id,code,name,status").eq("organization_id",context.organizationId).is("archived_at",null).order("name"),
  context.supabase.from("sac_categories").select("id,code,name,default_priority").eq("organization_id",context.organizationId).eq("active",true).order("name"),
  context.supabase.from("organization_memberships").select("user_id,role").eq("organization_id",context.organizationId).eq("active",true)
 ]);
 return{context,clients:clientsResult.data??[],projects:projectsResult.data??[],categories:categoriesResult.data??[],members:membersResult.data??[]};
}

export async function loadClientPortalRelationship(){
 const context=await requireClientContext();
 const[portalResult,categoriesResult]=await Promise.all([
  context.supabase.rpc("get_client_portal_relationship"),
  context.supabase.from("sac_categories").select("id,code,name,default_priority").eq("organization_id",context.client.organization_id).eq("active",true).order("name")
 ]);
 if(portalResult.error)throw new Error(portalResult.error.message);
 return{context,portal:portalResult.data&&typeof portalResult.data==="object"?portalResult.data as Record<string,unknown>: {},categories:categoriesResult.data??[]};
}

export async function loadClientSacTicket(id:string){
 const context=await requireClientContext();
 const{data,error}=await context.supabase.rpc("get_sac_ticket_detail",{p_ticket_id:id});
 if(error)throw new Error(error.message);return{context,detail:normalizeSacTicketDetail(data)};
}
