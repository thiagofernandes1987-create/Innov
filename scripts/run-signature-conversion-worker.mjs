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
function stableIdentifier(value){
  if(typeof value==="number"&&Number.isFinite(value))return String(value);
  if(typeof value!=="string")return null;
  const normalized=value.trim().toUpperCase();
  return /^[A-Z0-9_.:-]{1,60}$/.test(normalized)?normalized:null;
}
function failureCode(stage,error){
  const provider=error&&typeof error==="object"
    ?stableIdentifier(error.code)??stableIdentifier(error.statusCode)??stableIdentifier(error.name)
    :null;
  if(!provider||provider==="ERROR")return stage;
  const combined=`${stage}:${provider}`;
  return combined.length<=120?combined:stage;
}
function logFailure(event,fields={}){console.error(JSON.stringify({ok:false,event,...fields}));}

async function runOnce(){
  const{data:job,error:lockError}=await supabase.rpc("lock_signature_conversion_job",{p_worker_id:workerId});
  if(lockError){logFailure("signature_conversion_lock_failed",{errorCode:failureCode("CONVERSION_LOCK_FAILED",lockError)});return false;}
  if(!job){console.log(JSON.stringify({ok:true,processed:false,reason:"queue-empty"}));return false;}
  const temporary=await mkdtemp(path.join(tmpdir(),"innovar-docx-"));
  let stage="CONVERSION_FAILED";
  try{
    stage="CONVERSION_VERSION_LOAD_FAILED";
    const{data:version,error:versionError}=await supabase.from("signature_document_versions")
      .select("id,organization_id,document_id,version_number,original_storage_path,original_file_name")
      .eq("id",job.document_version_id).single();
    if(versionError||!version)throw versionError??new Error("VERSION_NOT_FOUND");

    stage="CONVERSION_SOURCE_DOWNLOAD_FAILED";
    const{data:source,error:downloadError}=await supabase.storage.from("signature-artifacts").download(version.original_storage_path);
    if(downloadError||!source)throw downloadError??new Error("SOURCE_UNAVAILABLE");

    stage="CONVERSION_LOCAL_RENDER_FAILED";
    const inputPath=path.join(temporary,"source.docx");
    await writeFile(inputPath,Buffer.from(await source.arrayBuffer()));
    await execute(soffice,["--headless","--convert-to","pdf","--outdir",temporary,inputPath],{timeout:120000,maxBuffer:2*1024*1024});
    const outputPath=path.join(temporary,"source.pdf");
    const pdfBytes=await readFile(outputPath);

    stage="CONVERSION_PDF_VALIDATION_FAILED";
    const pdf=await PDFDocument.load(pdfBytes,{ignoreEncryption:false});
    const digest=sha256(pdfBytes);
    const storagePath=`${version.organization_id}/documents/${version.document_id}/rendered/v${version.version_number}.pdf`;

    stage="CONVERSION_RENDER_UPLOAD_FAILED";
    const{error:uploadError}=await supabase.storage.from("signature-artifacts").upload(storagePath,pdfBytes,{contentType:"application/pdf",upsert:false});
    if(uploadError)throw uploadError;

    stage="CONVERSION_COMPLETE_JOB_FAILED";
    const{error:completeError}=await supabase.rpc("complete_signature_conversion_job",{
      p_job_id:job.id,p_rendered_pdf_path:storagePath,p_rendered_pdf_sha256:digest,p_page_count:pdf.getPageCount()
    });
    if(completeError)throw completeError;
    console.log(JSON.stringify({ok:true,processed:true,jobId:job.id,documentVersionId:version.id,pageCount:pdf.getPageCount(),sha256:digest}));
    return true;
  }catch(error){
    const errorCode=failureCode(stage,error);
    const{error:failureRecordError}=await supabase.rpc("fail_signature_conversion_job",{p_job_id:job.id,p_error:errorCode,p_retry_after:"00:15:00"});
    if(failureRecordError)logFailure("signature_conversion_failure_record_failed",{jobId:job.id,errorCode:failureCode("CONVERSION_FAILURE_RECORD_FAILED",failureRecordError)});
    logFailure("signature_conversion_failed",{jobId:job.id,errorCode});
    return false;
  }finally{await rm(temporary,{recursive:true,force:true});}
}

const continuous=process.argv.includes("--continuous");
do{
  const processed=await runOnce();
  if(!continuous||!processed)break;
}while(true);
