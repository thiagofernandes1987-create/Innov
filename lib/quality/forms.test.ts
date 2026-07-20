import { describe, expect, it } from "vitest";
import { evaluateQualityResponse, parseQualityFormSchema, schemaSummary } from "./forms";

const fvs=parseQualityFormSchema({engineVersion:1,kind:"FVS",fields:[
  {key:"service",type:"SHORT_TEXT",label:"Serviço",required:true},
  {key:"checklist",type:"CHECKLIST",label:"Itens",required:true,items:[{key:"a",label:"Item A"},{key:"b",label:"Item B"}]}
]});

describe("quality forms engine",()=>{
  it("validates required fields",()=>{
    const evaluation=evaluateQualityResponse(fvs,{});
    expect(evaluation.valid).toBe(false);
    expect(evaluation.errors.length).toBeGreaterThan(1);
  });
  it("calculates conforming checklist score",()=>{
    const evaluation=evaluateQualityResponse(fvs,{service:"Alvenaria",checklist:{a:"CONFORMING",b:"CONFORMING"}});
    expect(evaluation).toMatchObject({valid:true,score:100,result:"CONFORMING"});
  });
  it("detects nonconformity",()=>{
    const evaluation=evaluateQualityResponse(fvs,{service:"Alvenaria",checklist:{a:"CONFORMING",b:"NONCONFORMING"}});
    expect(evaluation).toMatchObject({valid:true,score:50,result:"NONCONFORMING"});
  });
  it("summarizes schemas",()=>{
    expect(schemaSummary(fvs)).toEqual({fields:2,required:2,uploadFields:0,checklistItems:2});
  });
  it("rejects duplicate keys",()=>{
    expect(()=>parseQualityFormSchema({kind:"SURVEY",fields:[{key:"x",type:"SHORT_TEXT",label:"X"},{key:"x",type:"SHORT_TEXT",label:"Y"}]})).toThrow(/duplicada/);
  });
});
