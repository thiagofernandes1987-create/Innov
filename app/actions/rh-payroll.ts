"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { lerMoeda } from "@/lib/validacao/moeda";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function money(data:FormData,key:string){return lerMoeda(text(data,key));}
function dateOrNull(data:FormData,key:string){return text(data,key)||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function createRhRubricTransactional(data:FormData){
  const context=await requireCapability("rh","configure");
  const path="/app/rh/folha/rubricas/nova";
  const code=text(data,"code").toUpperCase();
  const name=text(data,"name");
  const formulaType=text(data,"formulaType")||"MANUAL";
  const validFrom=text(data,"validFrom");
  if(!code||!name||!validFrom)fail(path,"Código, nome e início de vigência são obrigatórios.");
  const{error}=await context.supabase.rpc("create_rh_rubric",{
    p_organization_id:context.organizationId,
    p_code:code,
    p_name:name,
    p_description:optional(data,"description"),
    p_payroll_kind:text(data,"payrollKind")||"EARNING",
    p_valid_from:validFrom,
    p_valid_to:dateOrNull(data,"validTo"),
    p_formula_type:formulaType,
    p_fixed_value:formulaType==="FIXED"?money(data,"fixedValue"):null,
    p_percent_value:formulaType==="PERCENT_OF_AMOUNT"?money(data,"percentValue"):null,
    p_calculation_priority:Number(text(data,"priority")||"100"),
    p_esocial_nature_code:optional(data,"esocialNatureCode"),
    p_cod_inc_cp:optional(data,"codIncCp"),
    p_cod_inc_irrf:optional(data,"codIncIrrf"),
    p_cod_inc_fgts:optional(data,"codIncFgts"),
    p_accounting_debit:optional(data,"accountingDebit"),
    p_accounting_credit:optional(data,"accountingCredit")
  });
  if(error)fail(path,error.message);
  redirect(`/app/rh/folha/rubricas?created=${encodeURIComponent(code)}`);
}
