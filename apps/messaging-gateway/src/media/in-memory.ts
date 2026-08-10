import type {
  MediaReference,
  MediaReferenceRepository,
  MediaScanResult,
  MediaSecurityPort,
  SignedMediaUrlProvider
} from "./contracts.js";
import { detectMimeFromSignature } from "./policy.js";

export class InMemoryMediaReferenceRepository implements MediaReferenceRepository {
  private readonly references = new Map<string, MediaReference>();

  async findByDeduplicationKey(
    organizationId: string,
    sha256: string,
    sizeBytes: number
  ): Promise<MediaReference | null> {
    return [...this.references.values()].find(item =>
      item.organizationId === organizationId &&
      item.sha256 === sha256 &&
      item.sizeBytes === sizeBytes
    ) ?? null;
  }

  async save(reference: MediaReference): Promise<MediaReference> {
    if (this.references.has(reference.mediaId)) throw new Error("MEDIA_REFERENCE_EXISTS");
    this.references.set(reference.mediaId, reference);
    return reference;
  }

  async update(reference: MediaReference): Promise<MediaReference> {
    if (!this.references.has(reference.mediaId)) throw new Error("MEDIA_REFERENCE_NOT_FOUND");
    this.references.set(reference.mediaId, reference);
    return reference;
  }

  async get(mediaId: string): Promise<MediaReference | null> {
    return this.references.get(mediaId) ?? null;
  }
}

export class SyntheticMediaSecurityPort implements MediaSecurityPort {
  readonly quarantined = new Map<string, readonly Uint8Array[]>();
  readonly removed: string[] = [];
  nextScanState: MediaScanResult["state"] = "CLEAN";

  async quarantine(input: {
    organizationId: string;
    mediaId: string;
    fileName: string;
    declaredMimeType: string;
    chunks: readonly Uint8Array[];
  }) {
    const path = `pending/${input.organizationId}/${input.mediaId}/${input.fileName}`;
    this.quarantined.set(path, input.chunks);
    return { objectPath: path };
  }

  async scan(input: {
    organizationId: string;
    mediaId: string;
    objectPath: string;
    sha256: string;
    sizeBytes: number;
    declaredMimeType: string;
    leadingBytes: Uint8Array;
  }): Promise<MediaScanResult> {
    return {
      state: this.nextScanState,
      detectedMimeType: detectMimeFromSignature(input.leadingBytes) ?? "application/octet-stream",
      signature: this.nextScanState === "BLOCKED" ? "EICAR-Test-Signature" : null,
      scannedAt: "2026-08-04T17:00:00.000Z"
    };
  }

  async promote(input: {
    organizationId: string;
    mediaId: string;
    quarantineObjectPath: string;
    detectedMimeType: string;
    redactMetadata: boolean;
  }) {
    return {
      cleanObjectPath: `clean/${input.organizationId}/${input.mediaId}`,
      metadataRedacted: input.redactMetadata
    };
  }

  async removeQuarantine(objectPath: string): Promise<void> {
    this.removed.push(objectPath);
    this.quarantined.delete(objectPath);
  }
}

export class SyntheticSignedMediaUrlProvider implements SignedMediaUrlProvider {
  async sign(cleanObjectPath: string, expiresInSeconds: number): Promise<string> {
    return `https://media.invalid/${encodeURIComponent(cleanObjectPath)}?expires=${expiresInSeconds}&signature=synthetic`;
  }
}
