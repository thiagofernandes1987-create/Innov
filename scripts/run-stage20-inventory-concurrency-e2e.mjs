import fs from"node:fs";
import{randomUUID}from"node:crypto";
import{createClient}from"@supabase/supabase-js";

const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","SUPABASE_SERVICE_ROLE_KEY","DEMO_ADMIN_PASSWORD"];
for(const name of required)if(!process.env[name])throw new Error(`Variável obrigatória ausente: ${name}`);
if(process.env.ALLOW_INSECURE_DEMO_USERS!=="true")throw new Error("E2E permitido somente na homologação isolada.");

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail=process.env.DEMO_ADMIN_EMAIL??"admin@innov.eng.br";
const reportPath="stage20-inventory-concurrency-report.json";
const runId=`e2e20-inventory-${Date.now()}-${randomUUID().slice(0,8)}`;
const fixtureCode="E2E20-CONCURRENCY";
const initialQuantity=10;
const competingQuantity=6;
const sessionOptions={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const operatorA=createClient(url,publishableKey,sessionOptions);
const operatorB=createClient(url,publishableKey,sessionOptions);
const service=createClient(url,serviceKey,sessionOptions);

let organizationId=null;
let itemId=null;
let warehouseId=null;
let locationId=null;
let entryMovementId=null;
const issueMovementIds=[];
let failure=null;

function row(value){return Array.isArray(value)?value[0]??null:value??null;}
function assert(condition,message){if(!condition)throw new Error(message);}
function errorMessage(error){return error&&typeof error==="object"&&"message"in error?String(error.message):String(error);}
function normalizeMessage(message){return String(message).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
async function signIn(client){
 const{data,error}=await client.auth.signInWithPassword({email:adminEmail,password:process.env.DEMO_ADMIN_PASSWORD});
 if(error)throw new Error(`Login ${adminEmail}: ${error.message}`);
 assert(data.user&&data.session,"Sessão administrativa não criada.");
 return{user:data.user,session:data.session};
}
async function rpc(client,name,args){
 const{data,error}=await client.rpc(name,args);
 if(error)throw new Error(`${name}: ${error.message}`);
 return data;
}
async function rpcOutcome(client,name,args){
 const startedAt=Date.now();
 const{data,error}=await client.rpc(name,args);
 return{data,error,durationMs:Date.now()-startedAt};
}
async function selectSingle(query,label){
 const{data,error}=await query.maybeSingle();
 if(error)throw new Error(`${label}: ${error.message}`);
 assert(data,`${label}: registro não encontrado.`);
 return data;
}
async function getStock(){
 const{data,error}=await service.from("inventory_available_stock_v")
  .select("physical_quantity,reserved_quantity,available_quantity")
  .eq("organization_id",organizationId)
  .eq("warehouse_id",warehouseId)
  .eq("location_id",locationId)
  .eq("item_id",itemId)
  .is("lot_id",null)
  .maybeSingle();
 if(error)throw new Error(`Consulta de saldo: ${error.message}`);
 return{
  physical:Number(data?.physical_quantity??0),
  reserved:Number(data?.reserved_quantity??0),
  available:Number(data?.available_quantity??0)
 };
}
async function createMovement(client,{type,quantity,key,reason,post}){
 const created=row(await rpc(client,"create_inventory_movement",{
  p_organization_id:organizationId,
  p_project_id:null,
  p_movement_type:type,
  p_occurred_at:new Date().toISOString(),
  p_reason:reason,
  p_notes:`Execução técnica ${runId}`,
  p_lines:[{
   warehouseId,
   locationId,
   itemId,
   lotId:null,
   assetId:null,
   reservationLineId:null,
   procurementReceiptItemId:null,
   quantityDelta:quantity,
   unitCost:1,
   notes:`Fixture ${runId}`
  }],
  p_idempotency_key:key,
  p_post:post
 }));
 assert(created?.id,`Movimento ${type} não foi criado.`);
 return created;
}
async function movementStatus(movementId){
 const{data,error}=await service.from("inventory_movements").select("id,status").eq("id",movementId).maybeSingle();
 if(error)throw new Error(`Status do movimento ${movementId}: ${error.message}`);
 return data?.status??null;
}
async function reverseIfPosted(movementId,reason){
 if(!movementId)return null;
 const status=await movementStatus(movementId);
 if(status==="POSTED")return row(await rpc(operatorA,"reverse_inventory_movement",{p_movement_id:movementId,p_reason:reason}));
 return null;
}
async function deleteDraft(movementId){
 if(!movementId)return;
 const status=await movementStatus(movementId);
 if(status!=="DRAFT")return;
 const lineDelete=await service.from("inventory_movement_lines").delete().eq("movement_id",movementId);
 if(lineDelete.error)throw new Error(`Limpeza de linhas ${movementId}: ${lineDelete.error.message}`);
 const movementDelete=await service.from("inventory_movements").delete().eq("id",movementId);
 if(movementDelete.error)throw new Error(`Limpeza de movimento ${movementId}: ${movementDelete.error.message}`);
}
async function normalizeFixtureStock(){
 const current=await getStock();
 assert(current.reserved===0,"Fixture de concorrência possui quantidade reservada e não pode ser normalizada automaticamente.");
 if(current.physical===0)return null;
 const normalization=await createMovement(operatorA,{
  type:"ADJUSTMENT",
  quantity:-current.physical,
  key:`${runId}-normalize`,
  reason:"Normalização controlada da fixture E2E20",
  post:true
 });
 const normalized=await getStock();
 assert(normalized.physical===0&&normalized.available===0,"Normalização da fixture não zerou o saldo.");
 return normalization.id;
}
async function prepareFixture(adminUserId){
 const membership=await selectSingle(
  service.from("organization_memberships")
   .select("organization_id,role,active")
   .eq("user_id",adminUserId)
   .eq("active",true)
   .in("role",["SUPER_ADMIN","DIRECAO","ADMINISTRADOR"])
   .limit(1),
  "Membership administrativa"
 );
 organizationId=membership.organization_id;
 await rpc(service,"install_inventory_defaults",{p_organization_id:organizationId});

 const unit=await selectSingle(service.from("inventory_units").select("id").eq("organization_id",organizationId).eq("code","un"),"Unidade padrão");
 const category=await selectSingle(service.from("inventory_categories").select("id").eq("organization_id",organizationId).eq("code","MAT"),"Categoria padrão");
 const warehouse=await selectSingle(service.from("inventory_warehouses").select("id").eq("organization_id",organizationId).eq("code","ALM-GERAL"),"Depósito padrão");
 warehouseId=warehouse.id;
 const location=await selectSingle(service.from("inventory_locations").select("id").eq("warehouse_id",warehouseId).eq("code","PADRAO"),"Localização padrão");
 locationId=location.id;

 const warehouseUpdate=await service.from("inventory_warehouses").update({allows_negative_stock:false,active:true}).eq("id",warehouseId);
 if(warehouseUpdate.error)throw new Error(`Proteção do depósito: ${warehouseUpdate.error.message}`);
 const{data:item,error:itemError}=await service.from("inventory_items").upsert({
  organization_id:organizationId,
  category_id:category.id,
  unit_id:unit.id,
  code:fixtureCode,
  name:"Fixture técnica — concorrência de estoque",
  description:"Item permanente de homologação da Etapa 20. Não utilizar em operação real.",
  specification:"Saldo deve permanecer zero fora da execução E2E.",
  kind:"MATERIAL",
  minimum_stock:0,
  controls_lot:false,
  controls_expiry:false,
  controls_individual_asset:false,
  active:true,
  updated_at:new Date().toISOString()
 },{onConflict:"organization_id,code"}).select("id").single();
 if(itemError)throw new Error(`Fixture de item: ${itemError.message}`);
 itemId=item.id;
 return membership.role;
}

const report={
 runId,
 status:"running",
 startedAt:new Date().toISOString(),
 scenario:{initialQuantity,competingQuantity,expectedSuccessfulPosts:1,expectedFinalQuantityAfterRace:4},
 checks:[]
};
const check=(name,details={})=>report.checks.push({name,ok:true,...details});

try{
 const[loginA,loginB]=await Promise.all([signIn(operatorA),signIn(operatorB)]);
 assert(loginA.user.id===loginB.user.id,"As sessões de concorrência devem representar o mesmo operador autorizado.");
 assert(loginA.session.access_token!==loginB.session.access_token,"As conexões independentes receberam o mesmo token de sessão.");
 check("independent_authenticated_sessions",{userId:loginA.user.id});

 const role=await prepareFixture(loginA.user.id);
 check("fixture_scope",{organizationId,warehouseId,locationId,itemId,role,fixtureCode});
 const normalizationMovementId=await normalizeFixtureStock();
 if(normalizationMovementId)check("fixture_normalized",{normalizationMovementId});

 const entry=await createMovement(operatorA,{
  type:"MANUAL_IN",
  quantity:initialQuantity,
  key:`${runId}-entry`,
  reason:"Entrada inicial para disputa concorrente E2E20",
  post:true
 });
 entryMovementId=entry.id;
 const stockAfterEntry=await getStock();
 assert(stockAfterEntry.physical===initialQuantity&&stockAfterEntry.available===initialQuantity,"Entrada inicial não produziu o saldo esperado.");
 check("initial_stock_posted",{entryMovementId,stock:stockAfterEntry});

 const[issueA,issueB]=await Promise.all([
  createMovement(operatorA,{type:"ISSUE",quantity:-competingQuantity,key:`${runId}-issue-a`,reason:"Disputa concorrente A",post:false}),
  createMovement(operatorB,{type:"ISSUE",quantity:-competingQuantity,key:`${runId}-issue-b`,reason:"Disputa concorrente B",post:false})
 ]);
 issueMovementIds.push(issueA.id,issueB.id);
 check("competing_drafts_created",{movementIds:[issueA.id,issueB.id]});

 const outcomes=await Promise.all([
  rpcOutcome(operatorA,"post_inventory_movement",{p_movement_id:issueA.id}),
  rpcOutcome(operatorB,"post_inventory_movement",{p_movement_id:issueB.id})
 ]);
 const successful=outcomes.map((outcome,index)=>({...outcome,index,movementId:issueMovementIds[index]})).filter(outcome=>!outcome.error);
 const rejected=outcomes.map((outcome,index)=>({...outcome,index,movementId:issueMovementIds[index]})).filter(outcome=>outcome.error);
 assert(successful.length===1,`Esperada exatamente uma postagem; obtidas ${successful.length}.`);
 assert(rejected.length===1,`Esperada exatamente uma rejeição; obtidas ${rejected.length}.`);
 const rejectionMessage=errorMessage(rejected[0].error);
 const normalizedRejection=normalizeMessage(rejectionMessage);
 assert(normalizedRejection.includes("saldo negativo")||normalizedRejection.includes("quantidade reservada"),`Rejeição inesperada: ${rejectionMessage}`);
 check("advisory_lock_serialized_posts",{
  successfulMovementId:successful[0].movementId,
  rejectedMovementId:rejected[0].movementId,
  rejection:"insufficient_available_stock",
  durationsMs:outcomes.map(outcome=>outcome.durationMs)
 });

 const stockAfterRace=await getStock();
 assert(stockAfterRace.physical===initialQuantity-competingQuantity,"Saldo físico final da disputa é inconsistente.");
 assert(stockAfterRace.available===initialQuantity-competingQuantity,"Saldo disponível final da disputa é inconsistente.");
 assert(stockAfterRace.physical>=0&&stockAfterRace.available>=0,"Concorrência produziu saldo negativo.");
 const statuses=await Promise.all(issueMovementIds.map(movementStatus));
 assert(statuses.filter(status=>status==="POSTED").length===1&&statuses.filter(status=>status==="DRAFT").length===1,"Estados finais dos movimentos concorrentes são inválidos.");
 check("final_stock_consistency",{stock:stockAfterRace,statuses});

 report.status="passed";
 report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";
 report.finishedAt=new Date().toISOString();
 report.error=failure.message;
}finally{
 const cleanup={reversed:[],deletedDrafts:[],errors:[]};
 try{
  for(const movementId of issueMovementIds){
   const reversal=await reverseIfPosted(movementId,`Cleanup E2E20 ${runId}`);
   if(reversal?.id)cleanup.reversed.push({movementId,reversalMovementId:reversal.id});
  }
  for(const movementId of issueMovementIds){
   const status=await movementStatus(movementId);
   if(status==="DRAFT"){await deleteDraft(movementId);cleanup.deletedDrafts.push(movementId);}
  }
  const entryReversal=await reverseIfPosted(entryMovementId,`Cleanup da entrada E2E20 ${runId}`);
  if(entryReversal?.id)cleanup.reversed.push({movementId:entryMovementId,reversalMovementId:entryReversal.id});
  if(itemId&&warehouseId&&locationId){
   const finalStock=await getStock();
   cleanup.finalStock=finalStock;
   assert(finalStock.physical===0&&finalStock.reserved===0&&finalStock.available===0,"Cleanup não restaurou saldo zero da fixture.");
  }
  report.cleanup="passed";
 }catch(error){
  cleanup.errors.push(errorMessage(error));
  report.cleanup="failed";
  report.cleanupError=errorMessage(error);
  if(!failure)failure=error instanceof Error?error:new Error(String(error));
 }
 report.cleanupDetails=cleanup;
 await Promise.allSettled([operatorA.auth.signOut(),operatorB.auth.signOut()]);
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
