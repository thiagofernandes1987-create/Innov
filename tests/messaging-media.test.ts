import { describe, expect, it, vi } from "vitest";
import {
  InMemoryMediaReferenceRepository,
  MESSAGING_MEDIA_MAX_BYTES,
  SyntheticMediaSecurityPort,
  SyntheticSignedMediaUrlProvider,
  createSecureMediaPipeline,
  sanitizeMediaFileName,
  type MediaUploadRequest
} from "../apps/messaging-gateway/src/media/index.js";

async function* chunks(...values: Uint8Array[]) {
  for (const value of values) yield value;
}

function pdfBytes(text = "fixture") {
  return new Uint8Array(Buffer.from(`%PDF-1.7\n${text}\n%%EOF`, "utf8"));
}

function request(overrides: Partial<MediaUploadRequest> = {}): MediaUploadRequest {
  const body = pdfBytes();
  return {
    organizationId: "org-1",
    channelAccountId: "account-1",
    messageId: "message-1",
    providerType: "WHATSAPP_WEB_BAILEYS",
    providerMediaId: "provider-media-1",
    mediaType: "DOCUMENT",
    declaredMimeType: "application/pdf",
    fileName: "contrato.pdf",
    chunks: chunks(body),
    expectedSizeBytes: body.byteLength,
    redactMetadata: true,
    ...overrides
  };
}

function setup() {
  const repository = new InMemoryMediaReferenceRepository();
  const security = new SyntheticMediaSecurityPort();
  const signedUrls = new SyntheticSignedMediaUrlProvider();
  const pipeline = createSecureMediaPipeline({
    repository,
    security,
    signedUrls,
    now: () => new Date("2026-08-04T17:00:00.000Z"),
    createMediaId: () => "media-1"
  });
  return { repository, security, pipeline };
}

describe("Messaging secure media W-12", () => {
  it("faz streaming para quarentena, valida assinatura e promove somente CLEAN", async () => {
    const { security, pipeline } = setup();
    const result = await pipeline.ingest(request());
    expect(result.state).toBe("CLEAN");
    expect(result.detectedMimeType).toBe("application/pdf");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.cleanObjectPath).toBe("clean/org-1/media-1");
    expect(result.metadataRedacted).toBe(true);
    expect(security.removed).toEqual(["pending/org-1/media-1/contrato.pdf"]);
    expect(JSON.stringify(result)).not.toContain("base64");
  });

  it("deduplica retry pelo hash e não repete quarentena", async () => {
    const { security, pipeline } = setup();
    const first = await pipeline.ingest(request());
    const second = await pipeline.ingest(request({ providerMediaId: "provider-media-2" }));
    expect(second.mediaId).toBe(first.mediaId);
    expect(security.removed).toHaveLength(1);
  });

  it("mantém malware BLOCKED na quarentena e proíbe URL assinada", async () => {
    const { security, pipeline } = setup();
    security.nextScanState = "BLOCKED";
    const blocked = await pipeline.ingest(request());
    expect(blocked.state).toBe("BLOCKED");
    expect(blocked.cleanObjectPath).toBeNull();
    expect(security.quarantined.size).toBe(1);
    await expect(pipeline.createSignedUrl(blocked.mediaId)).rejects.toThrow("MEDIA_NOT_CLEAN");
  });

  it("rejeita arquivo truncado quando tamanho esperado diverge", async () => {
    const { pipeline } = setup();
    const body = pdfBytes();
    await expect(pipeline.ingest(request({
      chunks: chunks(body.subarray(0, 5)),
      expectedSizeBytes: body.byteLength
    }))).rejects.toThrow("MEDIA_TRUNCATED_OR_OVERSIZED");
  });

  it("rejeita arquivo acima do limite sem persistir referência", async () => {
    const { repository, pipeline } = setup();
    const oneMegabyte = new Uint8Array(1024 * 1024);
    oneMegabyte.set(Buffer.from("%PDF-1.7"));
    async function* oversized() {
      for (let index = 0; index < 26; index += 1) yield oneMegabyte;
    }
    await expect(pipeline.ingest(request({
      chunks: oversized(),
      expectedSizeBytes: null
    }))).rejects.toThrow("MEDIA_TOO_LARGE");
    expect(await repository.get("media-1")).toBeNull();
    expect(MESSAGING_MEDIA_MAX_BYTES).toBe(25 * 1024 * 1024);
  });

  it("rejeita MIME declarado incompatível com a assinatura real", async () => {
    const { pipeline } = setup();
    const body = pdfBytes();
    await expect(pipeline.ingest(request({
      mediaType: "IMAGE",
      declaredMimeType: "image/jpeg",
      fileName: "imagem.jpg",
      chunks: chunks(body),
      expectedSizeBytes: body.byteLength
    }))).rejects.toThrow("MEDIA_MIME_MISMATCH");
  });

  it("rejeita assinatura desconhecida mesmo com MIME permitido", async () => {
    const { pipeline } = setup();
    const body = new Uint8Array(Buffer.from("not-a-real-pdf", "utf8"));
    await expect(pipeline.ingest(request({
      chunks: chunks(body),
      expectedSizeBytes: body.byteLength
    }))).rejects.toThrow("MEDIA_SIGNATURE_UNKNOWN");
  });

  it("gera URL assinada temporária apenas após CLEAN", async () => {
    const { pipeline } = setup();
    const clean = await pipeline.ingest(request());
    const url = await pipeline.createSignedUrl(clean.mediaId, 300);
    expect(url).toContain("https://media.invalid/");
    expect(url).toContain("expires=300");
    expect(url).toContain("signature=synthetic");
    await expect(pipeline.createSignedUrl(clean.mediaId, 5)).rejects.toThrow("SIGNED_URL_TTL_INVALID");
  });

  it("sanitiza nome de arquivo e remove path traversal", () => {
    expect(sanitizeMediaFileName("../../segredo\ncontrato?.pdf")).toBe(".._.._segredo_contrato_.pdf");
    expect(sanitizeMediaFileName("/\\\0\n")).toBe("attachment.bin");
  });

  it("executa OCR, transcrição e thumbnail somente sob política", async () => {
    const repository = new InMemoryMediaReferenceRepository();
    const security = new SyntheticMediaSecurityPort();
    const transcribe = vi.fn(async () => "transcription-ref");
    const ocr = vi.fn(async () => "ocr-ref");
    const thumbnail = vi.fn(async () => "thumbnail-ref");
    const pipeline = createSecureMediaPipeline({
      repository,
      security,
      signedUrls: new SyntheticSignedMediaUrlProvider(),
      processors: { transcribe, ocr, thumbnail },
      now: () => new Date("2026-08-04T17:00:00.000Z"),
      createMediaId: () => "media-policy"
    });
    await pipeline.ingest(request({
      providerMediaId: "provider-policy",
      allowTranscription: true,
      allowOcr: false
    }));
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(ocr).not.toHaveBeenCalled();
    expect(thumbnail).toHaveBeenCalledTimes(1);
  });
});
