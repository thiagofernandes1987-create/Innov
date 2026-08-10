import { createHash, randomUUID } from "node:crypto";
import type {
  MediaReference,
  MediaReferenceRepository,
  MediaSecurityPort,
  MediaUploadRequest,
  OptionalMediaProcessor,
  SignedMediaUrlProvider
} from "./contracts.js";
import {
  MESSAGING_MEDIA_MAX_BYTES,
  assertDetectedMime,
  assertMediaPolicy,
  detectMimeFromSignature,
  sanitizeMediaFileName
} from "./policy.js";

export type SecureMediaPipelineOptions = {
  repository: MediaReferenceRepository;
  security: MediaSecurityPort;
  signedUrls: SignedMediaUrlProvider;
  processors?: OptionalMediaProcessor;
  now?: () => Date;
  createMediaId?: () => string;
};

async function consumeBoundedStream(
  chunks: AsyncIterable<Uint8Array>,
  expectedSizeBytes?: number | null
): Promise<{ chunks: Uint8Array[]; sizeBytes: number; sha256: string; leadingBytes: Uint8Array }> {
  const result: Uint8Array[] = [];
  const hash = createHash("sha256");
  let sizeBytes = 0;
  let leading = Buffer.alloc(0);
  for await (const chunk of chunks) {
    if (!(chunk instanceof Uint8Array) || chunk.byteLength === 0) continue;
    sizeBytes += chunk.byteLength;
    if (sizeBytes > MESSAGING_MEDIA_MAX_BYTES) throw new Error("MEDIA_TOO_LARGE");
    hash.update(chunk);
    result.push(chunk);
    if (leading.byteLength < 64) {
      leading = Buffer.concat([leading, Buffer.from(chunk)]).subarray(0, 64);
    }
  }
  if (sizeBytes === 0) throw new Error("MEDIA_EMPTY");
  if (expectedSizeBytes !== null && expectedSizeBytes !== undefined && expectedSizeBytes !== sizeBytes) {
    throw new Error("MEDIA_TRUNCATED_OR_OVERSIZED");
  }
  return {
    chunks: result,
    sizeBytes,
    sha256: hash.digest("hex"),
    leadingBytes: new Uint8Array(leading)
  };
}

export function createSecureMediaPipeline(options: SecureMediaPipelineOptions) {
  const now = options.now ?? (() => new Date());
  const createMediaId = options.createMediaId ?? randomUUID;

  return {
    async ingest(request: MediaUploadRequest): Promise<MediaReference> {
      assertMediaPolicy(request);
      const streamed = await consumeBoundedStream(request.chunks, request.expectedSizeBytes);
      const detected = assertDetectedMime(
        request.declaredMimeType,
        detectMimeFromSignature(streamed.leadingBytes)
      );
      const duplicate = await options.repository.findByDeduplicationKey(
        request.organizationId,
        streamed.sha256,
        streamed.sizeBytes
      );
      if (duplicate?.state === "CLEAN") return duplicate;

      const mediaId = duplicate?.mediaId ?? createMediaId();
      const safeFileName = sanitizeMediaFileName(request.fileName);
      const quarantined = await options.security.quarantine({
        organizationId: request.organizationId,
        mediaId,
        fileName: safeFileName,
        declaredMimeType: request.declaredMimeType,
        chunks: streamed.chunks
      });
      let reference: MediaReference = {
        schemaVersion: "1.0.0",
        mediaId,
        organizationId: request.organizationId,
        channelAccountId: request.channelAccountId,
        messageId: request.messageId ?? null,
        providerType: request.providerType,
        providerMediaId: request.providerMediaId ?? null,
        mediaType: request.mediaType,
        declaredMimeType: request.declaredMimeType,
        detectedMimeType: detected,
        originalFileName: request.fileName,
        safeFileName,
        sizeBytes: streamed.sizeBytes,
        sha256: streamed.sha256,
        quarantineObjectPath: quarantined.objectPath,
        cleanObjectPath: null,
        state: "QUARANTINED",
        metadataRedacted: false,
        createdAt: now().toISOString(),
        scannedAt: null
      };
      reference = duplicate
        ? await options.repository.update(reference)
        : await options.repository.save(reference);

      try {
        reference = await options.repository.update({ ...reference, state: "SCANNING" });
        const scan = await options.security.scan({
          organizationId: request.organizationId,
          mediaId,
          objectPath: reference.quarantineObjectPath,
          sha256: reference.sha256,
          sizeBytes: reference.sizeBytes,
          declaredMimeType: reference.declaredMimeType,
          leadingBytes: streamed.leadingBytes
        });
        if (scan.state === "BLOCKED") {
          return options.repository.update({
            ...reference,
            state: "BLOCKED",
            detectedMimeType: scan.detectedMimeType,
            scannedAt: scan.scannedAt
          });
        }
        assertDetectedMime(reference.declaredMimeType, scan.detectedMimeType);
        const promoted = await options.security.promote({
          organizationId: request.organizationId,
          mediaId,
          quarantineObjectPath: reference.quarantineObjectPath,
          detectedMimeType: scan.detectedMimeType,
          redactMetadata: request.redactMetadata ?? true
        });
        reference = await options.repository.update({
          ...reference,
          state: "CLEAN",
          detectedMimeType: scan.detectedMimeType,
          cleanObjectPath: promoted.cleanObjectPath,
          metadataRedacted: promoted.metadataRedacted,
          scannedAt: scan.scannedAt
        });
        await options.security.removeQuarantine(reference.quarantineObjectPath);
        if (request.allowTranscription) await options.processors?.transcribe?.(reference);
        if (request.allowOcr) await options.processors?.ocr?.(reference);
        await options.processors?.thumbnail?.(reference);
        return reference;
      } catch (error) {
        await options.repository.update({ ...reference, state: "ERROR" });
        throw error;
      }
    },

    async createSignedUrl(mediaId: string, expiresInSeconds = 300): Promise<string> {
      if (expiresInSeconds < 30 || expiresInSeconds > 3600) throw new Error("SIGNED_URL_TTL_INVALID");
      const reference = await options.repository.get(mediaId);
      if (!reference || reference.state !== "CLEAN" || !reference.cleanObjectPath) {
        throw new Error("MEDIA_NOT_CLEAN");
      }
      return options.signedUrls.sign(reference.cleanObjectPath, expiresInSeconds);
    }
  };
}
