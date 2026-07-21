import fs from"node:fs";
import{randomUUID}from"node:crypto";
import{createClient}from"@supabase/supabase-js";

const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","SUPABASE_SERVICE_ROLE_KEY","DEMO_ADMIN_PASSWORD","DEMO_CLIENT_PASSWORD"];
for(const name of required)if(!process.env[name])throw new Error(`Variável obrigatória ausente: ${name}`);
if(process.env.ALLOW_INSECURE_DEMO_USERS!=="true")throw new Error("E2E permitido somente na homologação isolada.");

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail=process.env.DEMO_ADMIN_EMAIL??"admin@innov.eng.br";
const clientEmail=process.env.DEMO_CLIENT_EMAIL??"cliente@cliente.com";
const reportPath="stage18-concurrent-e2e-report.json";
const runId=`e2e18-${Date.now()}-${randomUUID().slice(0,8)}`;

const sessionOptions={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const adminSession=createClient(url,publishableKey,sessionOptions);
const clientSession=createClient(url,publishableKey,sessionOptions);
const service=createClient(url,serviceKey,sessionOptions);
let ticketId=null;
let failure=null;

function row(value){return Array.isArray(value)?value[0]??null:value??null;}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function list(value){return Array.isArray(value)?value:[];}
function assert(condition,message){if(!condition)throw new Error(message);}
async function rpc(client,name,args){const{data,error}=await client.rpc(name,args);if(error)throw new Error(`${name}: ${error.message}`);return data;}
async function signIn(client,email,password){const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error(`Login ${email}: ${error.message}`);assert(data.user&&data.session,`Sessão não criada para ${email}.`);return data.user;}
async function cleanup(){if(!ticketId)return;const tables=["sac_ticket_attachments","sac_ticket_messages","sac_ticket_events","crm_activities","sac_tickets"];for(const table of tables){const column=table==="sac_tickets"?"id":"ticket_id";const{error}=await service.from(table).delete().eq(column,ticketId);if(error)throw new Error(`Limpeza ${table}: ${error.message}`);}}

const report={runId,status:"running",startedAt:new Date().toISOString(),checks:[]};
const check=(name,details={})=>report.checks.push({name,ok:true,...details});

try{
 const[adminUser,clientUser]=await Promise.all([
  signIn(adminSession,adminEmail,process.env.DEMO_ADMIN_PASSWORD),
  signIn(clientSession,clientEmail,process.env.DEMO_CLIENT_PASSWORD)
 ]);
 assert(adminUser.id!==clientUser.id,"Administrador e cliente não podem compartilhar identidade.");
 check("parallel_login",{adminUserId:adminUser.id,clientUserId:clientUser.id});

 const{data:clientRecord,error:clientError}=await service.from("clients").select("id,organization_id,user_id").eq("user_id",clientUser.id).maybeSingle();
 if(clientError)throw clientError;
 assert(clientRecord,"Cliente de homologação não está vinculado.");
 const{data:membership,error:membershipError}=await service.from("organization_memberships").select("organization_id,role,active").eq("organization_id",clientRecord.organization_id).eq("user_id",adminUser.id).eq("active",true).maybeSingle();
 if(membershipError)throw membershipError;
 assert(membership,"Administrador não possui membership na organização do cliente.");
 check("identity_scope",{organizationId:clientRecord.organization_id,clientId:clientRecord.id,adminRole:membership.role});

 const idempotencyKey=`${runId}-ticket`;
 const created=row(await rpc(clientSession,"create_sac_ticket",{
  p_organization_id:clientRecord.organization_id,p_client_id:clientRecord.id,p_project_id:null,p_contract_id:null,p_category_id:null,
  p_title:`E2E concorrente ${runId}`,p_description:"Chamado temporário para validar sessões simultâneas.",p_source:"PORTAL",p_priority:"NORMAL",p_idempotency_key:idempotencyKey
 }));
 assert(created?.id,"Chamado não foi criado pelo cliente.");ticketId=created.id;
 const repeated=row(await rpc(clientSession,"create_sac_ticket",{
  p_organization_id:clientRecord.organization_id,p_client_id:clientRecord.id,p_project_id:null,p_contract_id:null,p_category_id:null,
  p_title:`E2E repetido ${runId}`,p_description:"Repetição idempotente.",p_source:"PORTAL",p_priority:"NORMAL",p_idempotency_key:idempotencyKey
 }));
 assert(repeated?.id===ticketId,"Criação idempotente retornou chamado diferente.");
 check("client_ticket_idempotency",{ticketId});

 const[adminInitialRaw,clientInitialRaw]=await Promise.all([
  rpc(adminSession,"get_sac_ticket_detail",{p_ticket_id:ticketId}),
  rpc(clientSession,"get_sac_ticket_detail",{p_ticket_id:ticketId})
 ]);
 const adminInitial=object(adminInitialRaw);const clientInitial=object(clientInitialRaw);
 assert(adminInitial.internal===true,"Sessão interna não foi reconhecida.");
 assert(clientInitial.internal===false,"Sessão do cliente recebeu contexto interno.");
 check("parallel_initial_read");

 const internalBody=`INTERNAL-${runId}`;const clientBody=`CLIENT-${runId}`;
 const[internalMessage,clientMessage]=await Promise.all([
  rpc(adminSession,"add_sac_ticket_message",{p_ticket_id:ticketId,p_visibility:"INTERNAL",p_body:internalBody,p_idempotency_key:`${runId}-internal-1`}),
  rpc(clientSession,"add_sac_ticket_message",{p_ticket_id:ticketId,p_visibility:"CLIENT",p_body:clientBody,p_idempotency_key:`${runId}-client-1`})
 ]);
 assert(row(internalMessage)?.visibility==="INTERNAL","Mensagem interna perdeu visibilidade.");
 assert(row(clientMessage)?.visibility==="CLIENT","Mensagem do cliente perdeu visibilidade.");
 check("parallel_messages");

 const followUpBody=`CLIENT-FOLLOWUP-${runId}`;
 const[transitioned,followUp]=await Promise.all([
  rpc(adminSession,"transition_sac_ticket",{p_ticket_id:ticketId,p_to_status:"TRIAGE",p_reason:"E2E concorrente"}),
  rpc(clientSession,"add_sac_ticket_message",{p_ticket_id:ticketId,p_visibility:"CLIENT",p_body:followUpBody,p_idempotency_key:`${runId}-client-2`})
 ]);
 assert(row(transitioned)?.status==="TRIAGE","Transição concorrente não chegou a TRIAGE.");
 assert(row(followUp)?.body===followUpBody,"Mensagem concorrente do cliente não foi persistida.");
 check("parallel_transition_and_message");

 const[{error:adminDirectError},{error:clientDirectError}]=await Promise.all([
  adminSession.from("sac_tickets").update({status:"CLOSED"}).eq("id",ticketId),
  clientSession.from("sac_tickets").update({status:"CLOSED"}).eq("id",ticketId)
 ]);
 assert(adminDirectError,"Administrador conseguiu alterar status diretamente.");
 assert(clientDirectError,"Cliente conseguiu alterar status diretamente.");
 check("workflow_direct_update_blocked");

 const[adminFinalRaw,clientFinalRaw,adminRowsResult,clientRowsResult]=await Promise.all([
  rpc(adminSession,"get_sac_ticket_detail",{p_ticket_id:ticketId}),
  rpc(clientSession,"get_sac_ticket_detail",{p_ticket_id:ticketId}),
  adminSession.from("sac_ticket_messages").select("body,visibility").eq("ticket_id",ticketId),
  clientSession.from("sac_ticket_messages").select("body,visibility").eq("ticket_id",ticketId)
 ]);
 if(adminRowsResult.error)throw adminRowsResult.error;if(clientRowsResult.error)throw clientRowsResult.error;
 const adminFinal=object(adminFinalRaw);const clientFinal=object(clientFinalRaw);
 const adminBodies=list(adminFinal.messages).map(message=>object(message).body);
 const clientBodies=list(clientFinal.messages).map(message=>object(message).body);
 assert(adminBodies.includes(internalBody)&&adminBodies.includes(clientBody)&&adminBodies.includes(followUpBody),"Administrador não visualiza todas as mensagens.");
 assert(!clientBodies.includes(internalBody),"Mensagem interna vazou para o cliente.");
 assert(clientBodies.includes(clientBody)&&clientBodies.includes(followUpBody),"Cliente não visualiza mensagens públicas.");
 assert(list(clientFinal.events).length===0,"Eventos internos vazaram para o cliente.");
 assert((adminRowsResult.data??[]).some(message=>message.visibility==="INTERNAL"),"RLS interna não retornou mensagem interna ao administrador.");
 assert(!(clientRowsResult.data??[]).some(message=>message.visibility==="INTERNAL"),"RLS expôs mensagem interna ao cliente.");
 assert(object(adminFinal.ticket).status==="TRIAGE"&&object(clientFinal.ticket).status==="TRIAGE","Sessões divergem sobre o estado final.");
 check("final_rls_and_consistency",{adminMessages:adminBodies.length,clientMessages:clientBodies.length,status:"TRIAGE"});

 report.status="passed";report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";report.finishedAt=new Date().toISOString();report.error=failure.message;
}finally{
 try{await cleanup();report.cleanup="passed";}catch(error){report.cleanup="failed";report.cleanupError=error instanceof Error?error.message:String(error);if(!failure)failure=error instanceof Error?error:new Error(String(error));}
 await Promise.allSettled([adminSession.auth.signOut(),clientSession.auth.signOut()]);
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
