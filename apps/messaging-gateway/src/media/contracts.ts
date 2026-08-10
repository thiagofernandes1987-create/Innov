export const MEDIA_REFERENCE_SCHEMA_VERSION = "1.0.0" as const;

export type MediaType = "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO" | "STICKER" | "UNKNOWN";
export type MediaSecurityState =
  | "QUARANTINED"
  | "SCANNING"
  | "CLEAN"
  | "BLOCKED"
  | "ERROR";

export type MediaReference = {
  schemaVersion: typeof MEDIA_REFERENCE_SCHEMA_VERSION;
  mediaId: string;
  organizationId: string;
  channelAccountId: string;
  messageId?: string | null;
  providerType: "META_CLOUD" | "WHATSAPP_WEB_BAILEYS" | "WEB_CHAT";
  providerMediaId?: string | null;
  mediaType: MediaType;
  declaredMimeType: string;
  detectedMimeType?: string | null;
  originalFileName?: string | null;
  safeFileName: string;
  sizeBytes: number;
  sha256: string;
  quarantineObjectPath: string;
  cleanObjectPath?: string | null;
  state: MediaSecurityState;
  metadataRedacted: boolean;
  createdAt: string;
  scannedAt?: string | null;
};

export type MediaUploadRequest = {
  organizationId: string;
  channelAccountId: string;
  messageId?: string | null;
  providerType: MediaReference["providerType"];
  providerMediaId?: string | null;
  mediaType: MediaType;
  declaredMimeType: string;
  fileName: string;
  chunks: AsyncIterable<Uint8Array>;
  expectedSizeBytes?: number | null;
  allowTranscription?: boolean;
  allowOcr?: boolean;
  redactMetadata?: boolean;
};

export type MediaScanResult = {
  state: "CLEAN" | "BLOCKED";
  detectedMimeType: string;
  signature?: string | null;
  scannedAt: string;
};

export interface MediaSecurityPort {
  quarantine(input: {
    organizationId: string;
    mediaId: string;
    fileName: string;
    declaredMimeType: string;
    chunks: readonly Uint8Array[];
  }): Promise<{ objectPath: string }>;
  scan(input: {
    organizationId: string;
    mediaId: string;
    objectPath: string;
    sha256: string;
    sizeBytes: number;
    declaredMimeType: string;
    leadingBytes: Uint8Array;
  }): Promise<MediaScanResult>;
  promote(input: {
    organizationId: string;
    mediaId: string;
    quarantineObjectPath: string;
    detectedMimeType: string;
    redactMetadata: boolean;
  }): Promise<{ cleanObjectPath: string; metadataRedacted: boolean }>;
  removeQuarantine(objectPath: string): Promise<void>;
}

export interface MediaReferenceRepository {
  findByDeduplicationKey(organizationId: string, sha256: string, sizeBytes: number): Promise<MediaReference | null>;
  save(reference: MediaReference): Promise<MediaReference>;
  update(reference: MediaReference): Promise<MediaReference>;
  get(mediaId: string): Promise<MediaReference | null>;
}

export interface SignedMediaUrlProvider {
  sign(cleanObjectPath: string, expiresInSeconds: number): Promise<string>;
}

export interface OptionalMediaProcessor {
  thumbnail?(reference: MediaReference): Promise<string | null>;
  transcribe?(reference: MediaReference): Promise<string | null>;
  ocr?(reference: MediaReference): Promise<string | null>;
}
