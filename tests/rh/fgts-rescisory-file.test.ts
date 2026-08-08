import{describe,expect,it}from"vitest";
import{renderFgtsRescisoryFile,validateFgtsRescisoryWorker}from"@/lib/rh/integrations/fgts-rescisory-file";

const worker={employerRegistration:"12345678",workerCpf:"16123828315",admissionDate:"2010-01-11",registrationNumber:"mat000123",remunerations:[{competence:"2017-01",category:"103",principal:500},{competence:"2017-04",absence:true},{competence:"2017-12",category:"101",principal:1340,thirteenth:670}]};

describe("FGTS Digital rescisório 1.2",()=>{
 it("gera linhas 1/2 sem cabeçalho e com decimal brasileiro",()=>{const file=renderFgtsRescisoryFile([worker]);expect(file).toBe("1;12345678;16123828315;11-01-2010;mat000123;\n2;01-2017;103;500,00;;\n2;04-2017;;;;S\n2;12-2017;101;1340,00;670,00;\n");});
 it("bloqueia competências a partir de março/2024",()=>{const invalid={...worker,remunerations:[{competence:"2024-03",category:"101",principal:1000}]};expect(validateFgtsRescisoryWorker(invalid).errors.join(" ")).toMatch(/anterior a 2024-03/);expect(()=>renderFgtsRescisoryFile([invalid])).toThrow(/anterior a 2024-03/);});
 it("exige categoria quando existe remuneração",()=>{const invalid={...worker,remunerations:[{competence:"2023-12",principal:1000}]};expect(validateFgtsRescisoryWorker(invalid).errors.join(" ")).toMatch(/categoria/);});
 it("exige mesma inscrição empregadora no arquivo",()=>{expect(()=>renderFgtsRescisoryFile([worker,{...worker,workerCpf:"11122233344",employerRegistration:"87654321"}])).toThrow(/mesmo empregador/);});
});
