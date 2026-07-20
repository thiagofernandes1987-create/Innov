import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

const execute=promisify(execFile);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!serviceRole)throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
const supabase=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
const workerId=process.env.SIGNATURE_CONVERSION_WORKER_ID??`conversion-${process.pid}-${randomUUID()}`;
const soffice=process.env.SIGNATURE_SOFFICE_BIN??"soffice";

function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}

async function runOnce(){
  const{data:job,error:lockError}=await supabase.rpc("lock_signature_conversion_job",{p_worker_id:workerId});
  if(lockError)throw lockError;
  if(!job){console.log(JSON.stringify({ok:true,processed:false,reason:"queue-empty"}));return false;}
  const temporary=await mkdtemp(path.join(tmpdir(),"innovar-docx-"));
  try{
    const{data:version,error:versionError}=await supabase.from("signature_document_versions")
      .select("id,organization_id,document_id,version_number,original_storage_path,original_file_name")
      .eq("id",job.document_version_id).single();
    if(versionError||!version)throw versionError??new Error("Versão não encontrada.");
    const{data:source,error:downloadError}=await supabase.storage.from("signature-artifacts").download(version.original_storage_path);
    if(downloadError||!source)throw downloadError??new Error("Original indisponível.");
    const inputPath=path.join(temporary,"source.docx");
    await writeFile(inputPath,Buffer.from(await source.arrayBuffer()));
    await execute(soffice,["--headless","--convert-to","pdf","--outdir",temporary,inputPath],{timeout:120000,maxBuffer:2*1024*1024});
    const outputPath=path.join(temporary,"source.pdf");
    const pdfBytes=await readFile(outputPath);
    const pdf=await PDFDocument.load(pdfBytes,{ignoreEncryption:false});
    const digest=sha256(pdfBytes);
    const storagePath=`${version.organization_id}/documents/${version.document_id}/rendered/v${version.version_number}.pdf`;
    const{error:uploadError}=await supabase.storage.from("signature-artifacts").upload(storagePath,pdfBytes,{contentType:"application/pdf",upsert:false});
    if(uploadError)throw uploadError;
    const{error:completeError}=await supabase.rpc("complete_signature_conversion_job",{
      p_job_id:job.id,p_rendered_pdf_path:storagePath,p_rendered_pdf_sha256:digest,p_page_count:pdf.getPageCount()
    });
    if(completeError)throw completeError;
    console.log(JSON.stringify({ok:true,processed:true,jobId:job.id,documentVersionId:version.id,pageCount:pdf.getPageCount(),sha256:digest}));
    return true;
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await supabase.rpc("fail_signature_conversion_job",{p_job_id:job.id,p_error:message,p_retry_after:"00:15:00"});
    console.error(JSON.stringify({ok:false,jobId:job.id,error:message}));
    return false;
  }finally{await rm(temporary,{recursive:true,force:true});}
}

const continuous=process.argv.includes("--continuous");
do{
  const processed=await runOnce();
  if(!continuous||!processed)break;
}while(true);
