export interface StorageAdapter {
  put(input: {tenantId:string; key:string; body:ReadableStream|Uint8Array; contentType:string; sha256:string}): Promise<{etag:string}>;
  getSignedUrl(input: {tenantId:string; key:string; expiresInSeconds:number}): Promise<string>;
  delete(input: {tenantId:string; key:string}): Promise<void>;
}
