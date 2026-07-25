export type UUID = string;
export type { CreateObjectRequest, ObjectDefinition, ObjectDefinitionPage, CreateRecordRequest, Record as RecordResponse, RecordPage, UpdateRecordRequest, WorkItem, WorkItemPage, DeadLetter, DeadLetterPage, DeadLetterReplay, ExecutionEvidence, ExecutionEvidenceList, DlqReplayRequest, DlqResolutionRequest, ExecutionEvidenceInput } from './generated-contract.js';
import type { CreateObjectRequest, ObjectDefinition, ObjectDefinitionPage, CreateRecordRequest, Record as RecordResponse, RecordPage, UpdateRecordRequest, WorkItemPage, DeadLetter, DeadLetterPage, DeadLetterReplay, ExecutionEvidence, ExecutionEvidenceList, DlqReplayRequest, DlqResolutionRequest, ExecutionEvidenceInput } from './generated-contract.js';
export interface RequestOptions { idempotencyKey?: UUID; signal?: AbortSignal; timezone?: string; language?: "pt-BR" | "en-US"; }
export interface InboxFilters { kind?: "TASK"|"ACTIVITY"|"APPROVAL"|"APPOINTMENT"|"ALERT"; pageSize?: number; after?: string; }
export interface ListFilters { pageSize?: number; after?: string; }
export interface InnovarClient {
  createObjectDefinition(body:CreateObjectRequest,options:RequestOptions & {idempotencyKey:UUID}):Promise<ObjectDefinition>;
  listObjectDefinitions(filters?:ListFilters,options?:RequestOptions):Promise<ObjectDefinitionPage>;
  createRecord(objectKey:string,body:CreateRecordRequest,options:RequestOptions & {idempotencyKey:UUID}):Promise<RecordResponse>;
  listRecords(objectKey:string,filters?:ListFilters & {filter?:string},options?:RequestOptions):Promise<RecordPage>;
  getRecord(objectKey:string,recordId:UUID,options?:RequestOptions):Promise<RecordResponse>;
  updateRecord(objectKey:string,recordId:UUID,expectedVersion:number,body:UpdateRecordRequest,options:RequestOptions & {idempotencyKey:UUID}):Promise<RecordResponse>;
  getWorkInbox(filters?:InboxFilters,options?:RequestOptions):Promise<WorkItemPage>;
  transitionObjectDefinition(objectKey:string,body:Record<string,unknown>,etag:string,options:RequestOptions & {idempotencyKey:UUID}):Promise<ObjectDefinition>;
  listDeadLetters(filters?:{consumer?:string},options?:RequestOptions):Promise<DeadLetterPage>;
  replayDeadLetter(id:UUID,body:DlqReplayRequest,options:RequestOptions & {idempotencyKey:UUID}):Promise<DeadLetterReplay>;
  resolveDeadLetter(id:UUID,body:DlqResolutionRequest,options:RequestOptions & {idempotencyKey:UUID}):Promise<DeadLetter>;
  listExecutionEvidence(filters?:Record<string,string>,options?:RequestOptions):Promise<ExecutionEvidenceList>;
  recordExecutionEvidence(body:ExecutionEvidenceInput,options:RequestOptions & {idempotencyKey:UUID}):Promise<ExecutionEvidence>;
  getInbox(filters?:InboxFilters,options?:RequestOptions):Promise<WorkItemPage>;
}
export interface InnovarClientOptions { baseUrl:string; accessToken:()=>Promise<string>; fetchImpl?:typeof fetch; timeoutMs?:number; }
export function createInnovarClient(options:InnovarClientOptions):InnovarClient {
 const f=options.fetchImpl??fetch; const timeoutMs=options.timeoutMs??30_000;
 async function request<T>(path:string,init:RequestInit,ro?:RequestOptions):Promise<T>{
  const token=await options.accessToken(); const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  ro?.signal?.addEventListener("abort",()=>controller.abort(),{once:true});
  try { const response=await f(new URL(path,options.baseUrl),{...init,signal:controller.signal,headers:{Authorization:`Bearer ${token}`,Accept:"application/json","Accept-Language":ro?.language??"pt-BR","X-Timezone":ro?.timezone??"America/Sao_Paulo",...(ro?.idempotencyKey?{"X-Idempotency-Key":ro.idempotencyKey}:{}),...init.headers}});
   if(response.status===304) throw Object.assign(new Error("NOT_MODIFIED"),{status:304});
   const body=await response.json().catch(()=>undefined); if(!response.ok) throw Object.assign(new Error(body?.title??`HTTP ${response.status}`),{status:response.status,body}); return body as T;
  } finally { clearTimeout(timeout); }
 }
 const listQuery=(filters?:ListFilters & {filter?:string})=>{const q=new URLSearchParams();if(filters?.pageSize)q.set("page[size]",String(filters.pageSize));if(filters?.after)q.set("page[after]",filters.after);if(filters?.filter)q.set("filter",filters.filter);return q.toString()};
 const getWorkInbox=(filters:InboxFilters={},ro?:RequestOptions)=>{const q=new URLSearchParams();if(filters.kind)q.set("kind",filters.kind);if(filters.pageSize)q.set("page[size]",String(filters.pageSize));if(filters.after)q.set("page[after]",filters.after);return request<WorkItemPage>(`/v1/work-inbox?${q}`,{method:"GET"},ro)};
 return {
  createObjectDefinition:(body,ro)=>request<ObjectDefinition>('/v1/objects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},ro),
  listObjectDefinitions:(filters={},ro)=>request<ObjectDefinitionPage>(`/v1/objects?${listQuery(filters)}`,{method:'GET'},ro),
  createRecord:(objectKey,body,ro)=>request<RecordResponse>(`/v1/objects/${encodeURIComponent(objectKey)}/records`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},ro),
  listRecords:(objectKey,filters={},ro)=>request<RecordPage>(`/v1/objects/${encodeURIComponent(objectKey)}/records?${listQuery(filters)}`,{method:'GET'},ro),
  getRecord:(objectKey,recordId,ro)=>request<RecordResponse>(`/v1/objects/${encodeURIComponent(objectKey)}/records/${recordId}`,{method:'GET'},ro),
  updateRecord:(objectKey,recordId,expectedVersion,body,ro)=>request<RecordResponse>(`/v1/objects/${encodeURIComponent(objectKey)}/records/${recordId}`,{method:'PATCH',headers:{'Content-Type':'application/merge-patch+json','If-Match':`"${expectedVersion}"`},body:JSON.stringify(body)},ro),
  getWorkInbox,
  transitionObjectDefinition:(objectKey,body,etag,ro)=>request<ObjectDefinition>(`/v1/objects/${encodeURIComponent(objectKey)}/transitions`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(body)},ro),
  listDeadLetters:(filters={},ro)=>{const q=new URLSearchParams(filters);return request<DeadLetterPage>(`/v1/admin/events/dlq?${q}`,{method:'GET'},ro)},
  replayDeadLetter:(id,body,ro)=>request<DeadLetterReplay>(`/v1/admin/events/dlq/${id}/replay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},ro),
  resolveDeadLetter:(id,body,ro)=>request<DeadLetter>(`/v1/admin/events/dlq/${id}/resolution`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},ro),
  listExecutionEvidence:(filters={},ro)=>{const q=new URLSearchParams(filters);return request<ExecutionEvidenceList>(`/v1/admin/execution-evidence?${q}`,{method:'GET'},ro)},
  recordExecutionEvidence:(body,ro)=>request<ExecutionEvidence>('/v1/admin/execution-evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},ro),
  getInbox:getWorkInbox
 };
}
export * from './lifecycle.js';
