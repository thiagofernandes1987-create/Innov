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

/**
 * Política por fluxo. A análise antimalware é obrigatória em todos os casos; o
 * que varia é o que cada bucket aceita. `allowedMimeTypes:null` significa que o
 * fluxo já aceitava qualquer tipo antes da quarentena e continua aceitando, sem
 * estreitar comportamento existente.
 */
export type FileSecurityPolicy={
 allowedMimeTypes?:ReadonlySet<string>|null;
 maxBytes?:number;
 requireContentSignature?:boolean;
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

export function assertFileSecurityInput(input:FileSecurityInput,policy?:FileSecurityPolicy){
 const allowed=policy?.allowedMimeTypes===undefined?FILE_SECURITY_ALLOWED_MIME_TYPES:policy.allowedMimeTypes;
 const maxBytes=policy?.maxBytes??FILE_SECURITY_MAX_BYTES;
 const filename=sanitizeFileName(input.filename);
 if(!filename)throw new FileSecurityError("INVALID_FILENAME","Nome de arquivo inválido.");
 if(allowed&&!allowed.has(input.contentType))
  throw new FileSecurityError("UNSUPPORTED_MEDIA_TYPE",`Tipo de arquivo não permitido: ${input.contentType||"desconhecido"}.`);
 if(!Number.isFinite(input.sizeBytes)||input.sizeBytes<=0)
  throw new FileSecurityError("EMPTY_FILE","O arquivo está vazio ou possui tamanho inválido.");
 if(!Number.isFinite(maxBytes)||maxBytes<=0)
  throw new FileSecurityError("FILE_SECURITY_CONFIGURATION","Limite de tamanho inválido para o fluxo.");
 if(input.sizeBytes>maxBytes)
  throw new FileSecurityError("FILE_TOO_LARGE",`O arquivo excede o limite de ${maxBytes} bytes.`);
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

const CONTENT_SIGNATURE_TYPES=new Set([
 "application/pdf",
 "image/jpeg",
 "image/png",
 "image/webp",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

/**
 * Só existe assinatura de conteúdo conhecida para os formatos acima. Fluxos que
 * aceitam outros tipos (mídia de diário de obra, por exemplo) seguem para a
 * análise antimalware sem esta verificação, em vez de ficarem sem análise.
 */
export function hasKnownContentSignature(contentType:string){
 return CONTENT_SIGNATURE_TYPES.has(contentType);
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

/**
 * Mensagem pública para falha de upload analisado. Não vaza detalhe interno do
 * scanner nem do provedor de armazenamento.
 */
export function fileSecurityMessage(error:unknown,options?:{maxBytesLabel?:string;allowedLabel?:string}){
 const generic="O arquivo não pôde ser analisado com segurança. Tente novamente mais tarde.";
 if(!(error instanceof FileSecurityError))return generic;
 if(error.code==="MALWARE_DETECTED")return"O arquivo foi bloqueado pela análise de segurança.";
 if(error.code==="FILE_TOO_LARGE")return`O arquivo excede ${options?.maxBytesLabel??"25 MB"}.`;
 if(error.code==="UNSUPPORTED_MEDIA_TYPE")
  return options?.allowedLabel
   ? `Formato não permitido. Envie ${options.allowedLabel}.`
   : "Formato não permitido. Envie PDF, DOCX, JPG, PNG ou WebP.";
 if(error.code==="FILE_SIGNATURE_MISMATCH")return"O conteúdo do arquivo não corresponde ao formato informado.";
 if(error.code==="EMPTY_FILE"||error.code==="INVALID_FILENAME")return"Selecione um arquivo válido.";
 return generic;
}

export const FILE_SECURITY_STATUS_LABELS:Record<FileSecurityStatus,string>={
 LEGACY:"Legado não analisado",
 PENDING:"Aguardando análise",
 SCANNING:"Analisando arquivo",
 CLEAN:"Arquivo liberado",
 BLOCKED:"Arquivo bloqueado",
 ERROR:"Análise indisponível"
};
