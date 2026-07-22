export const FILE_SECURITY_MAX_BYTES=25*1024*1024;

export const FILE_SECURITY_ALLOWED_MIME_TYPES=new Set([
 "application/pdf",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 "image/jpeg",
 "image/png",
 "image/webp"
]);

export type FileSecurityStatus="PENDING"|"SCANNING"|"CLEAN"|"BLOCKED"|"ERROR";

export type FileSecurityInput={
 filename:string;
 contentType:string;
 sizeBytes:number;
};

export type FileSecurityScanResult={
 status:Exclude<FileSecurityStatus,"PENDING"|"SCANNING">;
 provider:"clamav"|"test-clean";
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

export function parseClamAvResponse(value:string):FileSecurityScanResult{
 const response=value.replace(/\0/g,"").trim();
 if(/:\s*OK$/i.test(response))return{status:"CLEAN",provider:"clamav",signature:null,rawCode:"OK"};
 const found=response.match(/:\s*(.+?)\s+FOUND$/i);
 if(found)return{status:"BLOCKED",provider:"clamav",signature:found[1]?.trim()||"malware",rawCode:"FOUND"};
 return{status:"ERROR",provider:"clamav",signature:null,rawCode:"ERROR"};
}

export const FILE_SECURITY_STATUS_LABELS:Record<FileSecurityStatus,string>={
 PENDING:"Aguardando análise",
 SCANNING:"Analisando arquivo",
 CLEAN:"Arquivo liberado",
 BLOCKED:"Arquivo bloqueado",
 ERROR:"Análise indisponível"
};
