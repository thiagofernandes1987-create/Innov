import {describe,expect,it} from "vitest";
import {compareProcurementQuotes} from "./comparison";

describe("compareProcurementQuotes",()=>{
  it("prioriza a melhor combinação de preço, prazo e cobertura",()=>{
    const rows=compareProcurementQuotes([
      {id:"a",supplierName:"Fornecedor A",total:10000,leadTimeDays:10,quotedItems:4,totalItems:4},
      {id:"b",supplierName:"Fornecedor B",total:9500,leadTimeDays:20,quotedItems:4,totalItems:4},
      {id:"c",supplierName:"Fornecedor C",total:9000,leadTimeDays:5,quotedItems:3,totalItems:4}
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0].id).toBe("c");
    expect(rows[0].rank).toBe(1);
    expect(rows[0].coveragePercent).toBe(75);
  });

  it("remove propostas sem total válido",()=>{
    const rows=compareProcurementQuotes([
      {id:"a",supplierName:"A",total:0,leadTimeDays:2,quotedItems:1,totalItems:1},
      {id:"b",supplierName:"B",total:100,leadTimeDays:null,quotedItems:1,totalItems:1}
    ]);
    expect(rows.map(item=>item.id)).toEqual(["b"]);
    expect(rows[0].leadTimeScore).toBe(0);
  });

  it("desempata pelo menor preço",()=>{
    const rows=compareProcurementQuotes([
      {id:"a",supplierName:"A",total:100,leadTimeDays:null,quotedItems:1,totalItems:1},
      {id:"b",supplierName:"B",total:120,leadTimeDays:null,quotedItems:1,totalItems:1}
    ]);
    expect(rows[0].id).toBe("a");
  });
});
