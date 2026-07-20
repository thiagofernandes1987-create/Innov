import{describe,expect,it}from"vitest";
import{buildProjectCsv,evaluateMetric,normalizeReportDashboard,targetFor}from"./metrics";

describe("motor de relatórios",()=>{
 it("classifica métricas onde valores mínimos são desejáveis",()=>{
  const target={metric_key:"quality",comparison:"MIN" as const,warning_value:90,critical_value:75};
  expect(evaluateMetric(95,target)).toBe("OK");
  expect(evaluateMetric(85,target)).toBe("WARNING");
  expect(evaluateMetric(70,target)).toBe("CRITICAL");
 });
 it("classifica métricas onde valores máximos são desejáveis",()=>{
  const target={metric_key:"delay",comparison:"MAX" as const,warning_value:1,critical_value:10};
  expect(evaluateMetric(0,target)).toBe("OK");
  expect(evaluateMetric(5,target)).toBe("WARNING");
  expect(evaluateMetric(15,target)).toBe("CRITICAL");
 });
 it("prioriza meta específica da obra",()=>{
  const targets=[
   {metric_key:"nps",comparison:"MIN" as const,warning_value:50,critical_value:0,project_id:null},
   {metric_key:"nps",comparison:"MIN" as const,warning_value:70,critical_value:40,project_id:"obra-1"}
  ];
  expect(targetFor(targets,"nps","obra-1")?.warning_value).toBe(70);
  expect(targetFor(targets,"nps","obra-2")?.warning_value).toBe(50);
 });
 it("normaliza JSON e gera CSV determinístico",()=>{
  const dashboard=normalizeReportDashboard({
   period:{start:"2026-01-01",end:"2026-12-31"},financialVisible:true,
   executive:{activeProjects:1,averageProgress:50},
   projects:[{project_id:"1",code:"OB-1",name:"Casa; Araucária",status:"ACTIVE",progress:50,planned_progress:60,schedule_variance_pp:-10}],
   financeMonthly:[],targets:[]
  });
  const csv=buildProjectCsv(dashboard);
  expect(dashboard.projects[0].overdue_tasks).toBe(0);
  expect(csv).toContain('"Casa; Araucária"');
  expect(csv.split("\r\n")).toHaveLength(2);
 });
});
