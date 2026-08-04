export const SESSION_STORE_SCHEMA_VERSION = 1 as const;
export const SESSION_STORE_CRYPTO_ALGORITHM = "AES-256-GCM" as const;
export const SESSION_STORE_PROVIDER_TYPE = "WHATSAPP_WEB_BAILEYS" as const;

export type SessionSecretScope = {
  organizationId: string;
  sessionId: string;
  channelAccountId: string;
  providerType: typeof SESSION_STORE_PROVIDER_TYPE;
};

export type SessionSecretEncoding = "BINARY" | "JSON_BUFFER_V1";

export type SessionKeyCategory =
  | "pre-key"
  | "session"
  | "sender-key"
  | "sender-key-memory"
  | "app-state-sync-key"
  | "app-state-sync-version"
  | "lid-mapping"
  | "device-list"
  | "tctoken"
  | "identity-key";

export type EncryptedPayload = {
  algorithm: typeof SESSION_STORE_CRYPTO_ALGORITHM;
  iv: string;
  ciphertext: string;
  authTag: string;
  aadSha256: string;
};

export type WrappedDataKey = EncryptedPayload & {
  keyId: string;
  keyVersion: number;
};

export type SessionEnvelopeRecord = SessionSecretScope & {
  schemaVersion: typeof SESSION_STORE_SCHEMA_VERSION;
  generation: number;
  dataKeyVersion: number;
  wrappedDataKey: WrappedDataKey;
  createdAt: string;
  updatedAt: string;
};

export type SessionCredentialRecord = {
  sessionId: string;
  recordVersion: number;
  encoding: SessionSecretEncoding;
  encryptedPayload: EncryptedPayload;
  updatedAt: string;
};

export type SessionKeyRecord = {
  sessionId: string;
  category: SessionKeyCategory;
  keyId: string;
  recordVersion: number;
  encoding: SessionSecretEncoding;
  encryptedPayload: EncryptedPayload;
  updatedAt: string;
};

export type CredentialSnapshot = SessionSecretScope & {
  schemaVersion: typeof SESSION_STORE_SCHEMA_VERSION;
  generation: number;
  recordVersion: number;
  dataKeyVersion: number;
  encoding: SessionSecretEncoding;
  material: Uint8Array;
  updatedAt: string;
};

export type CredentialWrite = SessionSecretScope & {
  expectedGeneration: number | null;
  encoding: SessionSecretEncoding;
  material: Uint8Array;
};

export type CredentialVersion = {
  generation: number;
  recordVersion: number;
  dataKeyVersion: number;
  updatedAt: string;
};

export type KeyRead = SessionSecretScope & {
  category: SessionKeyCategory;
  keyIds: readonly string[];
};

export type KeyReadEntry = {
  keyId: string;
  recordVersion: number;
  encoding: SessionSecretEncoding;
  material: Uint8Array;
};

export type KeyReadResult = {
  generation: number;
  dataKeyVersion: number;
  entries: Readonly<Record<string, KeyReadEntry>>;
};

export type KeyWriteEntry = {
  keyId: string;
  encoding: SessionSecretEncoding;
  material: Uint8Array | null;
};

export type KeyWrite = SessionSecretScope & {
  category: SessionKeyCategory;
  expectedGeneration: number;
  entries: readonly KeyWriteEntry[];
};

export type KeyWriteResult = {
  generation: number;
  dataKeyVersion: number;
  changed: number;
  deleted: number;
  updatedAt: string;
};

export type SessionSecretAuditAction =
  | "CREDENTIALS_READ"
  | "CREDENTIALS_WRITTEN"
  | "KEYS_READ"
  | "KEYS_WRITTEN"
  | "DATA_KEY_ROTATED"
  | "DATA_KEY_REWRAPPED"
  | "BACKUP_EXPORTED"
  | "BACKUP_RESTORED"
  | "SESSION_SECRETS_DELETED"
  | "ACCESS_REJECTED"
  | "INTEGRITY_FAILURE";

export type SessionSecretAuditEvent = SessionSecretScope & {
  eventId: string;
  action: SessionSecretAuditAction;
  outcome: "SUCCESS" | "REJECTED" | "FAILED";
  occurredAt: string;
  correlationId?: string | null;
  actorId?: string | null;
  generation?: number | null;
  attributes: Readonly<Record<string, string | number | boolean | null>>;
};

export type EncryptedSessionBackup = {
  schemaVersion: typeof SESSION_STORE_SCHEMA_VERSION;
  exportedAt: string;
  scope: SessionSecretScope;
  envelope: SessionEnvelopeRecord;
  credential: SessionCredentialRecord | null;
  keys: readonly SessionKeyRecord[];
  manifestSha256: string;
};

export interface SessionRepositoryTransaction {
  getEnvelope(sessionId: string): Promise<SessionEnvelopeRecord | null>;
  putEnvelope(record: SessionEnvelopeRecord): Promise<void>;
  deleteEnvelope(sessionId: string): Promise<void>;
  getCredential(sessionId: string): Promise<SessionCredentialRecord | null>;
  putCredential(record: SessionCredentialRecord): Promise<void>;
  deleteCredential(sessionId: string): Promise<void>;
  getKey(
    sessionId: string,
    category: SessionKeyCategory,
    keyId: string
  ): Promise<SessionKeyRecord | null>;
  listKeys(sessionId: string): Promise<readonly SessionKeyRecord[]>;
  putKey(record: SessionKeyRecord): Promise<void>;
  deleteKey(sessionId: string, category: SessionKeyCategory, keyId: string): Promise<void>;
  deleteKeys(sessionId: string): Promise<void>;
  appendAudit(event: SessionSecretAuditEvent): Promise<void>;
}

export interface SessionCredentialRepository {
  transaction<T>(operation: (transaction: SessionRepositoryTransaction) => Promise<T>): Promise<T>;
  listAuditEvents(sessionId: string): Promise<readonly SessionSecretAuditEvent[]>;
}

export type WrappedKeyRequest = {
  scope: SessionSecretScope;
  dataKeyVersion: number;
  plaintextDataKey: Uint8Array;
};

export type UnwrapKeyRequest = {
  scope: SessionSecretScope;
  dataKeyVersion: number;
  wrappedDataKey: WrappedDataKey;
};

export interface KeyEnvelopeProvider {
  wrapDataKey(request: WrappedKeyRequest): Promise<WrappedDataKey>;
  unwrapDataKey(request: UnwrapKeyRequest): Promise<Uint8Array>;
}

export interface SessionCredentialStore {
  loadCredentials(
    scope: SessionSecretScope,
    audit?: SessionAuditContext
  ): Promise<CredentialSnapshot | null>;
  compareAndSwapCredentials(
    input: CredentialWrite,
    audit?: SessionAuditContext
  ): Promise<CredentialVersion>;
  getKeys(input: KeyRead, audit?: SessionAuditContext): Promise<KeyReadResult>;
  setKeys(input: KeyWrite, audit?: SessionAuditContext): Promise<KeyWriteResult>;
  rotateSessionDataKey(
    scope: SessionSecretScope,
    expectedGeneration: number,
    audit?: SessionAuditContext
  ): Promise<CredentialVersion>;
  rewrapSessionDataKey(
    scope: SessionSecretScope,
    expectedGeneration: number,
    audit?: SessionAuditContext
  ): Promise<CredentialVersion>;
  exportEncryptedBackup(
    scope: SessionSecretScope,
    audit?: SessionAuditContext
  ): Promise<EncryptedSessionBackup>;
  restoreEncryptedBackup(
    backup: EncryptedSessionBackup,
    expectedGeneration: number | null,
    audit?: SessionAuditContext
  ): Promise<CredentialVersion>;
  deleteSessionSecrets(
    scope: SessionSecretScope,
    expectedGeneration: number,
    audit?: SessionAuditContext
  ): Promise<void>;
  listAuditEvents(sessionId: string): Promise<readonly SessionSecretAuditEvent[]>;
}

export type SessionAuditContext = {
  correlationId?: string | null;
  actorId?: string | null;
};

export type SessionStoreErrorCode =
  | "SESSION_NOT_FOUND"
  | "GENERATION_CONFLICT"
  | "INVALID_SCOPE"
  | "INVALID_SECRET_MATERIAL"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INTEGRITY_CHECK_FAILED"
  | "KEY_ENVELOPE_UNAVAILABLE"
  | "BACKUP_CONFLICT"
  | "BACKUP_CORRUPTED";

export class SessionStoreError extends Error {
  readonly code: SessionStoreErrorCode;
  readonly retryable: boolean;

  constructor(code: SessionStoreErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "SessionStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}
