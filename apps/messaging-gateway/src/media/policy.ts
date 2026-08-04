import type { MediaType } from "./contracts.js";

export const MESSAGING_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

const allowedMimeTypes: Readonly<Record<MediaType, readonly string[]>> = {
  DOCUMENT: ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  AUDIO: ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav"],
  VIDEO: ["video/mp4", "video/webm"],
  STICKER: ["image/webp"],
  UNKNOWN: []
};

export function sanitizeMediaFileName(fileName: string): string {
  const normalized = fileName.normalize("NFKC").replace(/[\\/\0\r\n]/g, "_").trim();
  const safe = normalized.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ");
  if (!safe || safe === "." || safe === ".." || !/[a-zA-Z0-9]/.test(safe)) {
    return "attachment.bin";
  }
  return safe.slice(0, 180);
}

export function assertMediaPolicy(input: {
  mediaType: MediaType;
  declaredMimeType: string;
  expectedSizeBytes?: number | null;
}): void {
  if (input.mediaType === "UNKNOWN") throw new Error("UNKNOWN_MEDIA_TYPE");
  const allowed = allowedMimeTypes[input.mediaType];
  if (!allowed.includes(input.declaredMimeType.toLowerCase())) throw new Error("MEDIA_MIME_NOT_ALLOWED");
  if (
    input.expectedSizeBytes !== null &&
    input.expectedSizeBytes !== undefined &&
    (input.expectedSizeBytes < 1 || input.expectedSizeBytes > MESSAGING_MEDIA_MAX_BYTES)
  ) throw new Error("MEDIA_SIZE_NOT_ALLOWED");
}

export function detectMimeFromSignature(leadingBytes: Uint8Array): string | null {
  const bytes = Buffer.from(leadingBytes);
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  return null;
}

export function assertDetectedMime(declaredMimeType: string, detectedMimeType: string | null): string {
  if (!detectedMimeType) throw new Error("MEDIA_SIGNATURE_UNKNOWN");
  const declared = declaredMimeType.toLowerCase();
  const compatible = declared === detectedMimeType ||
    (declared === "audio/mp4" && detectedMimeType === "video/mp4");
  if (!compatible) throw new Error("MEDIA_MIME_MISMATCH");
  return detectedMimeType;
}
