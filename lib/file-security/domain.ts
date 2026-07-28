export const FILE_SECURITY_MAX_BYTES=25*1024*1024;

export const FILE_SECURITY_ALLOWED_MIME_TYPES=new Set([
 "application/pdf",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 "image/jpeg",
 "image/png",
 "image/webp"
]);

export const FILE_SECURITY_SAC_MIME_TYPES=new Set([
 "application/pdf",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "image/jpeg",
 "image/png",
 "image/webp"
]);

export type FileSecurityStatus="LEGACY"|"PENDING"|"SCANNING"|"CLEAN"|"BLOCKED"|"ERROR";
export type FileSecurityProvider="clamav"|"clamav-http"|"test-clean";

export type FileSecurityInput={
 filename:string;
 contentType:string;
 sizeBytes:number;
};

export type FileSecurityScanResult={
 status:Exclude<FileSecurityStatus,"LEGACY"|"PENDING"|"SCANNING">;
 provider:FileSecurityProvider;
 signature:string|null;
 rawCode:"OK"|"FOUND"|"ERROR";
};

export class FileSecurityError extends Error{
 readonly code:string;
 constructor(code:string,message:string){super(message);this.name="FileSecurityError";this.code=code;}
}

export function sanitizeFileName(value:string){
 const normalized=value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g,"").trim();
 const base=normalized.split(/[\\/]/).at(-1)??"arquivo";
 const safe=base.replace(/[^\p{L}\p{N}._ -]+/gu,"-").replace(/\s+/g," ").replace(/^\.+/,"").slice(0,180);
 return safe||"arquivo";
}

export function assertFileSecurityInput(input:FileSecurityInput){
 const filename=sanitizeFileName(input.filename);
 if(!filename)throw new FileSecurityError("INVALID_FILENAME","Nome de arquivo inválido.");
 if(!FILE_SECURITY_ALLOWED_MIME_TYPES.has(input.contentType))
  throw new FileSecurityError("UNSUPPORTED_MEDIA_TYPE",`Tipo de arquivo não permitido: ${input.contentType||"desconhecido"}.`);
 if(!Number.isFinite(input.sizeBytes)||input.sizeBytes<=0)
  throw new FileSecurityError("EMPTY_FILE","O arquivo está vazio ou possui tamanho inválido.");
 if(input.sizeBytes>FILE_SECURITY_MAX_BYTES)
  throw new FileSecurityError("FILE_TOO_LARGE",`O arquivo excede o limite de ${FILE_SECURITY_MAX_BYTES} bytes.`);
 return{...input,filename};
}

function startsWith(bytes:Uint8Array,signature:number[]){
 return signature.every((value,index)=>bytes[index]===value);
}

function containsAscii(bytes:Uint8Array,value:string){
 const pattern=new TextEncoder().encode(value);
 if(pattern.length===0||bytes.length<pattern.length)return false;
 outer:for(let offset=0;offset<=bytes.length-pattern.length;offset+=1){
  for(let index=0;index<pattern.length;index+=1)if(bytes[offset+index]!==pattern[index])continue outer;
  return true;
 }
 return false;
}

export function assertFileContentSignature(contentType:string,bytes:Uint8Array){
 let valid=false;
 switch(contentType){
  case"application/pdf":
   valid=startsWith(bytes,[0x25,0x50,0x44,0x46,0x2d]);
   break;
  case"image/jpeg":
   valid=startsWith(bytes,[0xff,0xd8,0xff]);
   break;
  case"image/png":
   valid=startsWith(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
   break;
  case"image/webp":
   valid=startsWith(bytes,[0x52,0x49,0x46,0x46])&&bytes.length>=12&&startsWith(bytes.subarray(8),[0x57,0x45,0x42,0x50]);
   break;
  case"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
   valid=startsWith(bytes,[0x50,0x4b,0x03,0x04])&&containsAscii(bytes,"[Content_Types].xml")&&containsAscii(bytes,"word/");
   break;
  case"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
   valid=startsWith(bytes,[0x50,0x4b,0x03,0x04])&&containsAscii(bytes,"[Content_Types].xml")&&containsAscii(bytes,"xl/");
   break;
 }
 if(!valid)throw new FileSecurityError("FILE_SIGNATURE_MISMATCH","O conteúdo do arquivo não corresponde ao formato declarado.");
}

export function parseClamAvResponse(value:string):FileSecurityScanResult{
 const response=value.replace(/\0/g,"").trim();
 if(/:\s*OK$/i.test(response))return{status:"CLEAN",provider:"clamav",signature:null,rawCode:"OK"};
 const found=response.match(/:\s*(.+?)\s+FOUND$/i);
 if(found)return{status:"BLOCKED",provider:"clamav",signature:found[1]?.trim()||"malware",rawCode:"FOUND"};
 return{status:"ERROR",provider:"clamav",signature:null,rawCode:"ERROR"};
}

export const FILE_SECURITY_STATUS_LABELS:Record<FileSecurityStatus,string>={
 LEGACY:"Legado não analisado",
 PENDING:"Aguardando análise",
 SCANNING:"Analisando arquivo",
 CLEAN:"Arquivo liberado",
 BLOCKED:"Arquivo bloqueado",
 ERROR:"Análise indisponível"
};
