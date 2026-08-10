import fs from"node:fs";
import{createClient}from"@supabase/supabase-js";

function required(name){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} é obrigatório para cleanup RH E2E.`);return value;}
const seedPath=process.env.RH_E2E_SEED_FILE||"test-results/rh-e2e-seed.json";
if(!fs.existsSync(seedPath)){console.log(`Cleanup RH E2E: seed ausente em ${seedPath}; nada a remover.`);process.exit(0);}
const seed=JSON.parse(fs.readFileSync(seedPath,"utf8"));
const supabase=createClient(required("NEXT_PUBLIC_SUPABASE_URL"),required("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
async function remove(table,filters){let query=supabase.from(table).delete();for(const[key,value]of Object.entries(filters))query=query.eq(key,value);const{error}=await query;if(error)throw new Error(`cleanup ${table}: ${error.message}`);}

const periodId=seed.periodId,organizationId=seed.organizationId,workerId=seed.workerId,employmentId=seed.employmentId;
await remove("rh_payslip_publications",{organization_id:organizationId,period_id:periodId});
await remove("rh_payroll_closures",{organization_id:organizationId,period_id:periodId});
await remove("rh_payroll_runs",{organization_id:organizationId,period_id:periodId});
await remove("rh_payroll_inputs",{organization_id:organizationId,period_id:periodId});
await remove("rh_payroll_periods",{organization_id:organizationId,id:periodId});
await remove("rh_worker_user_links",{organization_id:organizationId,worker_id:workerId,user_id:seed.userId});
await remove("rh_employment_conditions",{organization_id:organizationId,employment_id:employmentId});
await remove("rh_employments",{organization_id:organizationId,id:employmentId});
await remove("rh_workers",{organization_id:organizationId,id:workerId});
await remove("rh_people",{organization_id:organizationId,id:seed.personId});
await remove("rh_rubric_versions",{organization_id:organizationId,id:seed.rubricVersionId});
await remove("rh_rubrics",{organization_id:organizationId,id:seed.rubricId});
await remove("rh_establishments",{organization_id:organizationId,id:seed.establishmentId});
await remove("rh_employers",{organization_id:organizationId,id:seed.employerId});
if(seed.escalated&&seed.originalRole){const{error}=await supabase.from("organization_memberships").update({role:seed.originalRole}).eq("organization_id",organizationId).eq("user_id",seed.userId);if(error)throw new Error(`restaurar role E2E: ${error.message}`);}
const evidence={runKey:seed.runKey,organizationId,periodId,cleanedAt:new Date().toISOString(),restoredRole:Boolean(seed.escalated),originalRole:seed.originalRole??null};fs.writeFileSync("test-results/rh-e2e-cleanup.json",JSON.stringify(evidence,null,2));console.log("Cleanup RH E2E concluído:",JSON.stringify(evidence));
