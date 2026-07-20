import{createHash}from"node:crypto";
import{NextRequest}from"next/server";
import{requireCapability}from"@/lib/authorization";
import{buildProjectCsv,normalizeReportDashboard}from"@/lib/reports/metrics";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 const projectId=request.nextUrl.searchParams.get("projectId");const periodStart=request.nextUrl.searchParams.get("start");const periodEnd=request.nextUrl.searchParams.get("end");
 const context=await requireCapability("relatorios","export",projectId);
 const{data,error}=await context.supabase.rpc("get_report_dashboard",{
  p_organization_id:context.organizationId,p_project_id:projectId,p_period_start:periodStart,p_period_end:periodEnd
 });
 if(error)return Response.json({error:error.message},{status:400});
 const dashboard=normalizeReportDashboard(data);const csv=buildProjectCsv(dashboard);const bytes=`\uFEFF${csv}`;
 const hash=createHash("sha256").update(bytes,"utf8").digest("hex");
 const date=new Date().toISOString().slice(0,10);const fileName=projectId?`relatorio-obra-${date}.csv`:`relatorio-executivo-${date}.csv`;
 const{error:auditError}=await context.supabase.rpc("record_report_export",{
  p_organization_id:context.organizationId,p_kind:projectId?"PROJECT":"EXECUTIVE",p_project_id:projectId,p_format:"CSV",
  p_file_name:fileName,p_row_count:dashboard.projects.length,p_source_sha256:hash,p_saved_view_id:null,p_snapshot_id:null
 });
 if(auditError)return Response.json({error:auditError.message},{status:400});
 return new Response(bytes,{status:200,headers:{
  "Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${fileName}"`,
  "Cache-Control":"private, no-store","X-Content-SHA256":hash
 }});
}
