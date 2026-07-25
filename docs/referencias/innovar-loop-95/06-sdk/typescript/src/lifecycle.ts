export interface TransitionRequest { event:string; expected_version:number; reason_code?:string; data?:Record<string,unknown> }
export interface RequestOptions { idempotencyKey:string; etag:string; signal?:AbortSignal }

export async function transitionObject(baseUrl:string,token:string,objectKey:string,body:TransitionRequest,options:RequestOptions):Promise<Response>{
  if (!options.idempotencyKey) throw new Error('idempotencyKey is required');
  if (!options.etag) throw new Error('etag is required');
  return fetch(`${baseUrl}/v1/objects/${encodeURIComponent(objectKey)}/transitions`,{
    method:'POST',signal:options.signal,
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':options.idempotencyKey,'If-Match':options.etag},
    body:JSON.stringify(body)
  });
}
