import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";
import {
  SESSION_STORE_CRYPTO_ALGORITHM,
  SessionStoreError,
  type EncryptedPayload,
  type KeyEnvelopeProvider,
  type SessionSecretScope,
  type UnwrapKeyRequest,
  type WrappedDataKey,
  type WrappedKeyRequest
} from "./contracts.js";

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const GCM_AUTH_TAG_BYTES = 16;

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionDataKey(): Uint8Array {
  return randomBytes(AES_KEY_BYTES);
}

export function zeroize(value: Uint8Array): void {
  value.fill(0);
}

export function buildSecretAad(input: {
  scope: SessionSecretScope;
  recordKind: "DATA_KEY" | "CREDENTIALS" | "KEY";
  recordKey: string;
  recordVersion: number;
  dataKeyVersion: number;
}): Uint8Array {
  const canonical = JSON.stringify({
    channelAccountId: input.scope.channelAccountId,
    dataKeyVersion: input.dataKeyVersion,
    organizationId: input.scope.organizationId,
    providerType: input.scope.providerType,
    recordKey: input.recordKey,
    recordKind: input.recordKind,
    recordVersion: input.recordVersion,
    sessionId: input.scope.sessionId
  });
  return Buffer.from(canonical, "utf8");
}

export function encryptAuthenticated(input: {
  plaintext: Uint8Array;
  key: Uint8Array;
  aad: Uint8Array;
}): EncryptedPayload {
  assertAesKey(input.key);
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", input.key, iv, {
    authTagLength: GCM_AUTH_TAG_BYTES
  });
  cipher.setAAD(input.aad);
  const ciphertext = Buffer.concat([
    cipher.update(input.plaintext),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return {
    algorithm: SESSION_STORE_CRYPTO_ALGORITHM,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    authTag: authTag.toString("base64url"),
    aadSha256: sha256Hex(input.aad)
  };
}

export function decryptAuthenticated(input: {
  encrypted: EncryptedPayload;
  key: Uint8Array;
  aad: Uint8Array;
}): Uint8Array {
  assertAesKey(input.key);
  if (input.encrypted.algorithm !== SESSION_STORE_CRYPTO_ALGORITHM) {
    throw new SessionStoreError(
      "UNSUPPORTED_SCHEMA_VERSION",
      "Algoritmo do envelope criptográfico não suportado."
    );
  }
  if (input.encrypted.aadSha256 !== sha256Hex(input.aad)) {
    throw new SessionStoreError(
      "INTEGRITY_CHECK_FAILED",
      "Contexto autenticado do segredo não corresponde ao registro."
    );
  }

  try {
    const iv = Buffer.from(input.encrypted.iv, "base64url");
    const authTag = Buffer.from(input.encrypted.authTag, "base64url");
    if (iv.length !== GCM_IV_BYTES || authTag.length !== GCM_AUTH_TAG_BYTES) {
      throw new Error("invalid envelope length");
    }
    const decipher = createDecipheriv("aes-256-gcm", input.key, iv, {
      authTagLength: GCM_AUTH_TAG_BYTES
    });
    decipher.setAAD(input.aad);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(Buffer.from(input.encrypted.ciphertext, "base64url")),
      decipher.final()
    ]);
  } catch {
    throw new SessionStoreError(
      "INTEGRITY_CHECK_FAILED",
      "Falha de integridade ao abrir o envelope criptográfico."
    );
  }
}

function assertAesKey(key: Uint8Array): void {
  if (key.byteLength !== AES_KEY_BYTES) {
    throw new SessionStoreError(
      "KEY_ENVELOPE_UNAVAILABLE",
      "Chave criptográfica indisponível ou com tamanho inválido."
    );
  }
}

export class TestOnlyInMemoryKeyEnvelopeProvider implements KeyEnvelopeProvider {
  private activeKeyId: string;
  private activeKeyVersion: number;
  private readonly keys = new Map<string, Uint8Array>();

  constructor(input: {
    allowTestOnly: true;
    keyId?: string;
    keyVersion?: number;
    keyMaterial?: Uint8Array;
  }) {
    if (input.allowTestOnly !== true) {
      throw new SessionStoreError(
        "KEY_ENVELOPE_UNAVAILABLE",
        "Provider de KEK em memória é permitido somente em testes."
      );
    }
    this.activeKeyId = input.keyId ?? "test-kek";
    this.activeKeyVersion = input.keyVersion ?? 1;
    this.addKey(
      this.activeKeyId,
      this.activeKeyVersion,
      input.keyMaterial ?? randomBytes(AES_KEY_BYTES)
    );
  }

  addKey(keyId: string, keyVersion: number, keyMaterial: Uint8Array): void {
    assertAesKey(keyMaterial);
    this.keys.set(this.keyReference(keyId, keyVersion), Uint8Array.from(keyMaterial));
  }

  setActiveKey(keyId: string, keyVersion: number): void {
    if (!this.keys.has(this.keyReference(keyId, keyVersion))) {
      throw new SessionStoreError(
        "KEY_ENVELOPE_UNAVAILABLE",
        "Versão de KEK solicitada não está disponível."
      );
    }
    this.activeKeyId = keyId;
    this.activeKeyVersion = keyVersion;
  }

  async wrapDataKey(request: WrappedKeyRequest): Promise<WrappedDataKey> {
    const key = this.lookup(this.activeKeyId, this.activeKeyVersion);
    const aad = buildSecretAad({
      scope: request.scope,
      recordKind: "DATA_KEY",
      recordKey: `${this.activeKeyId}:${this.activeKeyVersion}`,
      recordVersion: this.activeKeyVersion,
      dataKeyVersion: request.dataKeyVersion
    });
    const encrypted = encryptAuthenticated({
      plaintext: request.plaintextDataKey,
      key,
      aad
    });
    return {
      ...encrypted,
      keyId: this.activeKeyId,
      keyVersion: this.activeKeyVersion
    };
  }

  async unwrapDataKey(request: UnwrapKeyRequest): Promise<Uint8Array> {
    const key = this.lookup(
      request.wrappedDataKey.keyId,
      request.wrappedDataKey.keyVersion
    );
    const aad = buildSecretAad({
      scope: request.scope,
      recordKind: "DATA_KEY",
      recordKey: `${request.wrappedDataKey.keyId}:${request.wrappedDataKey.keyVersion}`,
      recordVersion: request.wrappedDataKey.keyVersion,
      dataKeyVersion: request.dataKeyVersion
    });
    return decryptAuthenticated({ encrypted: request.wrappedDataKey, key, aad });
  }

  private lookup(keyId: string, keyVersion: number): Uint8Array {
    const key = this.keys.get(this.keyReference(keyId, keyVersion));
    if (!key) {
      throw new SessionStoreError(
        "KEY_ENVELOPE_UNAVAILABLE",
        "KEK necessária para abrir o envelope não está disponível."
      );
    }
    return Uint8Array.from(key);
  }

  private keyReference(keyId: string, keyVersion: number): string {
    return `${keyId}:${keyVersion}`;
  }
}
