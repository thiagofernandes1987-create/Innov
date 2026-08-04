import { randomUUID } from "node:crypto";
import {
  SESSION_STORE_SCHEMA_VERSION,
  SESSION_STORE_PROVIDER_TYPE,
  SessionStoreError,
  type CredentialSnapshot,
  type CredentialVersion,
  type EncryptedSessionBackup,
  type KeyEnvelopeProvider,
  type KeyReadEntry,
  type KeyReadResult,
  type KeyWriteResult,
  type SessionAuditContext,
  type SessionCredentialRecord,
  type SessionCredentialRepository,
  type SessionCredentialStore,
  type SessionEnvelopeRecord,
  type SessionKeyRecord,
  type SessionRepositoryTransaction,
  type SessionSecretAuditAction,
  type SessionSecretAuditEvent,
  type SessionSecretScope
} from "./contracts.js";
import {
  buildSecretAad,
  createSessionDataKey,
  decryptAuthenticated,
  encryptAuthenticated,
  sha256Hex,
  zeroize
} from "./envelope-crypto.js";

const MAX_SECRET_BYTES = 8 * 1024 * 1024;

export function createEncryptedSessionCredentialStore(input: {
  repository: SessionCredentialRepository;
  keyEnvelopeProvider: KeyEnvelopeProvider;
  clock?: () => Date;
  idGenerator?: () => string;
}): SessionCredentialStore {
  const clock = input.clock ?? (() => new Date());
  const idGenerator = input.idGenerator ?? randomUUID;

  return {
    async loadCredentials(scope, audit) {
      validateScope(scope);
      return input.repository.transaction(async transaction => {
        const envelope = await transaction.getEnvelope(scope.sessionId);
        if (!envelope) return null;
        assertScope(envelope, scope);
        const credential = await transaction.getCredential(scope.sessionId);
        if (!credential) return null;
        const dataKey = await unwrapDataKey(input.keyEnvelopeProvider, envelope);
        try {
          const material = decryptCredential(scope, envelope, credential, dataKey);
          await appendAudit(transaction, {
            scope,
            action: "CREDENTIALS_READ",
            outcome: "SUCCESS",
            generation: envelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: { recordVersion: credential.recordVersion }
          });
          return {
            ...scope,
            schemaVersion: SESSION_STORE_SCHEMA_VERSION,
            generation: envelope.generation,
            recordVersion: credential.recordVersion,
            dataKeyVersion: envelope.dataKeyVersion,
            encoding: credential.encoding,
            material,
            updatedAt: credential.updatedAt
          } satisfies CredentialSnapshot;
        } finally {
          zeroize(dataKey);
        }
      });
    },

    async compareAndSwapCredentials(write, audit) {
      validateScope(write);
      validateMaterial(write.material);
      return input.repository.transaction(async transaction => {
        const state = await resolveWritableEnvelope({
          transaction,
          scope: write,
          expectedGeneration: write.expectedGeneration,
          keyEnvelopeProvider: input.keyEnvelopeProvider,
          clock
        });
        const previous = await transaction.getCredential(write.sessionId);
        const recordVersion = (previous?.recordVersion ?? 0) + 1;
        const updatedAt = clock().toISOString();
        try {
          const encryptedPayload = encryptAuthenticated({
            plaintext: write.material,
            key: state.dataKey,
            aad: buildSecretAad({
              scope: write,
              recordKind: "CREDENTIALS",
              recordKey: "credentials",
              recordVersion,
              dataKeyVersion: state.envelope.dataKeyVersion
            })
          });
          const nextEnvelope = {
            ...state.envelope,
            generation: state.envelope.generation + 1,
            updatedAt
          };
          await transaction.putCredential({
            sessionId: write.sessionId,
            recordVersion,
            encoding: write.encoding,
            encryptedPayload,
            updatedAt
          });
          await transaction.putEnvelope(nextEnvelope);
          await appendAudit(transaction, {
            scope: write,
            action: "CREDENTIALS_WRITTEN",
            outcome: "SUCCESS",
            generation: nextEnvelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: {
              recordVersion,
              bytes: write.material.byteLength,
              createdSession: state.created
            }
          });
          return versionFrom(nextEnvelope, recordVersion, updatedAt);
        } finally {
          zeroize(state.dataKey);
        }
      });
    },

    async getKeys(read, audit) {
      validateScope(read);
      return input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, read);
        const dataKey = await unwrapDataKey(input.keyEnvelopeProvider, envelope);
        try {
          const entries: Record<string, KeyReadEntry> = {};
          for (const keyId of uniqueNonEmpty(read.keyIds)) {
            const record = await transaction.getKey(read.sessionId, read.category, keyId);
            if (!record) continue;
            entries[keyId] = {
              keyId,
              recordVersion: record.recordVersion,
              encoding: record.encoding,
              material: decryptKey(read, envelope, record, dataKey)
            };
          }
          await appendAudit(transaction, {
            scope: read,
            action: "KEYS_READ",
            outcome: "SUCCESS",
            generation: envelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: { category: read.category, count: Object.keys(entries).length }
          });
          return {
            generation: envelope.generation,
            dataKeyVersion: envelope.dataKeyVersion,
            entries
          } satisfies KeyReadResult;
        } finally {
          zeroize(dataKey);
        }
      });
    },

    async setKeys(write, audit) {
      validateScope(write);
      assertGeneration(write.expectedGeneration);
      const duplicateCheck = new Set<string>();
      for (const entry of write.entries) {
        if (!entry.keyId.trim()) {
          throw new SessionStoreError("INVALID_SECRET_MATERIAL", "Identificador de key vazio.");
        }
        if (duplicateCheck.has(entry.keyId)) {
          throw new SessionStoreError(
            "INVALID_SECRET_MATERIAL",
            "O mesmo identificador de key foi informado mais de uma vez."
          );
        }
        duplicateCheck.add(entry.keyId);
        if (entry.material) validateMaterial(entry.material);
      }

      return input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, write);
        assertExpectedGeneration(envelope, write.expectedGeneration);
        const dataKey = await unwrapDataKey(input.keyEnvelopeProvider, envelope);
        const updatedAt = clock().toISOString();
        let changed = 0;
        let deleted = 0;
        try {
          for (const entry of write.entries) {
            const previous = await transaction.getKey(
              write.sessionId,
              write.category,
              entry.keyId
            );
            if (entry.material === null) {
              if (previous) {
                await transaction.deleteKey(write.sessionId, write.category, entry.keyId);
                deleted += 1;
              }
              continue;
            }
            const recordVersion = (previous?.recordVersion ?? 0) + 1;
            await transaction.putKey({
              sessionId: write.sessionId,
              category: write.category,
              keyId: entry.keyId,
              recordVersion,
              encoding: entry.encoding,
              encryptedPayload: encryptAuthenticated({
                plaintext: entry.material,
                key: dataKey,
                aad: buildSecretAad({
                  scope: write,
                  recordKind: "KEY",
                  recordKey: `${write.category}:${entry.keyId}`,
                  recordVersion,
                  dataKeyVersion: envelope.dataKeyVersion
                })
              }),
              updatedAt
            });
            changed += 1;
          }
          const nextEnvelope = {
            ...envelope,
            generation: envelope.generation + 1,
            updatedAt
          };
          await transaction.putEnvelope(nextEnvelope);
          await appendAudit(transaction, {
            scope: write,
            action: "KEYS_WRITTEN",
            outcome: "SUCCESS",
            generation: nextEnvelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: { category: write.category, changed, deleted }
          });
          return {
            generation: nextEnvelope.generation,
            dataKeyVersion: nextEnvelope.dataKeyVersion,
            changed,
            deleted,
            updatedAt
          } satisfies KeyWriteResult;
        } finally {
          zeroize(dataKey);
        }
      });
    },

    async rotateSessionDataKey(scope, expectedGeneration, audit) {
      validateScope(scope);
      assertGeneration(expectedGeneration);
      return input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, scope);
        assertExpectedGeneration(envelope, expectedGeneration);
        const oldDataKey = await unwrapDataKey(input.keyEnvelopeProvider, envelope);
        const nextDataKey = createSessionDataKey();
        const updatedAt = clock().toISOString();
        const nextDataKeyVersion = envelope.dataKeyVersion + 1;
        let credentialVersion = 0;
        try {
          const credential = await transaction.getCredential(scope.sessionId);
          if (credential) {
            const plaintext = decryptCredential(scope, envelope, credential, oldDataKey);
            try {
              credentialVersion = credential.recordVersion + 1;
              await transaction.putCredential({
                ...credential,
                recordVersion: credentialVersion,
                encryptedPayload: encryptAuthenticated({
                  plaintext,
                  key: nextDataKey,
                  aad: buildSecretAad({
                    scope,
                    recordKind: "CREDENTIALS",
                    recordKey: "credentials",
                    recordVersion: credentialVersion,
                    dataKeyVersion: nextDataKeyVersion
                  })
                }),
                updatedAt
              });
            } finally {
              zeroize(plaintext);
            }
          }

          const keys = await transaction.listKeys(scope.sessionId);
          for (const keyRecord of keys) {
            const plaintext = decryptKey(scope, envelope, keyRecord, oldDataKey);
            try {
              const recordVersion = keyRecord.recordVersion + 1;
              await transaction.putKey({
                ...keyRecord,
                recordVersion,
                encryptedPayload: encryptAuthenticated({
                  plaintext,
                  key: nextDataKey,
                  aad: buildSecretAad({
                    scope,
                    recordKind: "KEY",
                    recordKey: `${keyRecord.category}:${keyRecord.keyId}`,
                    recordVersion,
                    dataKeyVersion: nextDataKeyVersion
                  })
                }),
                updatedAt
              });
            } finally {
              zeroize(plaintext);
            }
          }

          const wrappedDataKey = await input.keyEnvelopeProvider.wrapDataKey({
            scope,
            dataKeyVersion: nextDataKeyVersion,
            plaintextDataKey: nextDataKey
          });
          const nextEnvelope = {
            ...envelope,
            generation: envelope.generation + 1,
            dataKeyVersion: nextDataKeyVersion,
            wrappedDataKey,
            updatedAt
          };
          await transaction.putEnvelope(nextEnvelope);
          await appendAudit(transaction, {
            scope,
            action: "DATA_KEY_ROTATED",
            outcome: "SUCCESS",
            generation: nextEnvelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: {
              previousDataKeyVersion: envelope.dataKeyVersion,
              dataKeyVersion: nextDataKeyVersion,
              keyRecords: keys.length
            }
          });
          return versionFrom(nextEnvelope, credentialVersion, updatedAt);
        } finally {
          zeroize(oldDataKey);
          zeroize(nextDataKey);
        }
      });
    },

    async rewrapSessionDataKey(scope, expectedGeneration, audit) {
      validateScope(scope);
      assertGeneration(expectedGeneration);
      return input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, scope);
        assertExpectedGeneration(envelope, expectedGeneration);
        const dataKey = await unwrapDataKey(input.keyEnvelopeProvider, envelope);
        const updatedAt = clock().toISOString();
        try {
          const wrappedDataKey = await input.keyEnvelopeProvider.wrapDataKey({
            scope,
            dataKeyVersion: envelope.dataKeyVersion,
            plaintextDataKey: dataKey
          });
          const nextEnvelope = {
            ...envelope,
            generation: envelope.generation + 1,
            wrappedDataKey,
            updatedAt
          };
          await transaction.putEnvelope(nextEnvelope);
          const credential = await transaction.getCredential(scope.sessionId);
          await appendAudit(transaction, {
            scope,
            action: "DATA_KEY_REWRAPPED",
            outcome: "SUCCESS",
            generation: nextEnvelope.generation,
            audit,
            idGenerator,
            clock,
            attributes: {
              keyId: wrappedDataKey.keyId,
              keyVersion: wrappedDataKey.keyVersion
            }
          });
          return versionFrom(
            nextEnvelope,
            credential?.recordVersion ?? 0,
            updatedAt
          );
        } finally {
          zeroize(dataKey);
        }
      });
    },

    async exportEncryptedBackup(scope, audit) {
      validateScope(scope);
      return input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, scope);
        const credential = await transaction.getCredential(scope.sessionId);
        const keys = [...await transaction.listKeys(scope.sessionId)].sort(compareKeyRecords);
        await validateEncryptedRecords(
          input.keyEnvelopeProvider,
          scope,
          envelope,
          credential,
          keys
        );
        const backupWithoutManifest = {
          schemaVersion: SESSION_STORE_SCHEMA_VERSION,
          exportedAt: clock().toISOString(),
          scope: { ...scope },
          envelope: cloneEnvelope(envelope),
          credential: credential ? cloneCredential(credential) : null,
          keys: keys.map(cloneKey)
        };
        const backup: EncryptedSessionBackup = {
          ...backupWithoutManifest,
          manifestSha256: backupManifestSha256(backupWithoutManifest)
        };
        await appendAudit(transaction, {
          scope,
          action: "BACKUP_EXPORTED",
          outcome: "SUCCESS",
          generation: envelope.generation,
          audit,
          idGenerator,
          clock,
          attributes: { keyRecords: keys.length, containsPlaintext: false }
        });
        return backup;
      });
    },

    async restoreEncryptedBackup(backup, expectedGeneration, audit) {
      validateBackup(backup);
      const scope = backup.scope;
      validateScope(scope);
      await validateEncryptedRecords(
        input.keyEnvelopeProvider,
        scope,
        backup.envelope,
        backup.credential,
        backup.keys
      );

      return input.repository.transaction(async transaction => {
        const current = await transaction.getEnvelope(scope.sessionId);
        if (current) {
          assertScope(current, scope);
          if (expectedGeneration === null) {
            throw new SessionStoreError(
              "BACKUP_CONFLICT",
              "A restauração exige a geração atual da sessão existente."
            );
          }
          assertExpectedGeneration(current, expectedGeneration);
        } else if (expectedGeneration !== null) {
          throw new SessionStoreError(
            "SESSION_NOT_FOUND",
            "Sessão não encontrada para restauração condicionada."
          );
        }

        const updatedAt = clock().toISOString();
        const nextEnvelope = {
          ...cloneEnvelope(backup.envelope),
          generation: current
            ? current.generation + 1
            : Math.max(1, backup.envelope.generation + 1),
          updatedAt
        };
        await transaction.deleteCredential(scope.sessionId);
        await transaction.deleteKeys(scope.sessionId);
        await transaction.putEnvelope(nextEnvelope);
        if (backup.credential) await transaction.putCredential(cloneCredential(backup.credential));
        for (const key of backup.keys) await transaction.putKey(cloneKey(key));
        await appendAudit(transaction, {
          scope,
          action: "BACKUP_RESTORED",
          outcome: "SUCCESS",
          generation: nextEnvelope.generation,
          audit,
          idGenerator,
          clock,
          attributes: { keyRecords: backup.keys.length, verified: true }
        });
        return versionFrom(
          nextEnvelope,
          backup.credential?.recordVersion ?? 0,
          updatedAt
        );
      });
    },

    async deleteSessionSecrets(scope, expectedGeneration, audit) {
      validateScope(scope);
      assertGeneration(expectedGeneration);
      await input.repository.transaction(async transaction => {
        const envelope = await requireEnvelope(transaction, scope);
        assertExpectedGeneration(envelope, expectedGeneration);
        await transaction.deleteCredential(scope.sessionId);
        await transaction.deleteKeys(scope.sessionId);
        await transaction.deleteEnvelope(scope.sessionId);
        await appendAudit(transaction, {
          scope,
          action: "SESSION_SECRETS_DELETED",
          outcome: "SUCCESS",
          generation: envelope.generation,
          audit,
          idGenerator,
          clock,
          attributes: { cryptographicErasure: true }
        });
      });
    },

    async listAuditEvents(sessionId) {
      if (!sessionId.trim()) {
        throw new SessionStoreError("INVALID_SCOPE", "Identificador de sessão vazio.");
      }
      return input.repository.listAuditEvents(sessionId);
    }
  };
}

async function resolveWritableEnvelope(input: {
  transaction: SessionRepositoryTransaction;
  scope: SessionSecretScope;
  expectedGeneration: number | null;
  keyEnvelopeProvider: KeyEnvelopeProvider;
  clock: () => Date;
}): Promise<{ envelope: SessionEnvelopeRecord; dataKey: Uint8Array; created: boolean }> {
  const current = await input.transaction.getEnvelope(input.scope.sessionId);
  if (current) {
    assertScope(current, input.scope);
    if (input.expectedGeneration === null) {
      throw new SessionStoreError(
        "GENERATION_CONFLICT",
        "A sessão já existe; informe a geração esperada."
      );
    }
    assertExpectedGeneration(current, input.expectedGeneration);
    return {
      envelope: current,
      dataKey: await unwrapDataKey(input.keyEnvelopeProvider, current),
      created: false
    };
  }
  if (input.expectedGeneration !== null) {
    throw new SessionStoreError("SESSION_NOT_FOUND", "Sessão não encontrada.");
  }

  const dataKey = createSessionDataKey();
  const now = input.clock().toISOString();
  const dataKeyVersion = 1;
  const wrappedDataKey = await input.keyEnvelopeProvider.wrapDataKey({
    scope: input.scope,
    dataKeyVersion,
    plaintextDataKey: dataKey
  });
  return {
    envelope: {
      ...input.scope,
      schemaVersion: SESSION_STORE_SCHEMA_VERSION,
      generation: 0,
      dataKeyVersion,
      wrappedDataKey,
      createdAt: now,
      updatedAt: now
    },
    dataKey,
    created: true
  };
}

async function requireEnvelope(
  transaction: SessionRepositoryTransaction,
  scope: SessionSecretScope
): Promise<SessionEnvelopeRecord> {
  const envelope = await transaction.getEnvelope(scope.sessionId);
  if (!envelope) {
    throw new SessionStoreError("SESSION_NOT_FOUND", "Sessão não encontrada.");
  }
  assertScope(envelope, scope);
  if (envelope.schemaVersion !== SESSION_STORE_SCHEMA_VERSION) {
    throw new SessionStoreError(
      "UNSUPPORTED_SCHEMA_VERSION",
      "Versão do armazenamento de sessão não suportada."
    );
  }
  return envelope;
}

async function unwrapDataKey(
  provider: KeyEnvelopeProvider,
  envelope: SessionEnvelopeRecord
): Promise<Uint8Array> {
  return provider.unwrapDataKey({
    scope: envelope,
    dataKeyVersion: envelope.dataKeyVersion,
    wrappedDataKey: envelope.wrappedDataKey
  });
}

function decryptCredential(
  scope: SessionSecretScope,
  envelope: SessionEnvelopeRecord,
  credential: SessionCredentialRecord,
  dataKey: Uint8Array
): Uint8Array {
  return decryptAuthenticated({
    encrypted: credential.encryptedPayload,
    key: dataKey,
    aad: buildSecretAad({
      scope,
      recordKind: "CREDENTIALS",
      recordKey: "credentials",
      recordVersion: credential.recordVersion,
      dataKeyVersion: envelope.dataKeyVersion
    })
  });
}

function decryptKey(
  scope: SessionSecretScope,
  envelope: SessionEnvelopeRecord,
  keyRecord: SessionKeyRecord,
  dataKey: Uint8Array
): Uint8Array {
  return decryptAuthenticated({
    encrypted: keyRecord.encryptedPayload,
    key: dataKey,
    aad: buildSecretAad({
      scope,
      recordKind: "KEY",
      recordKey: `${keyRecord.category}:${keyRecord.keyId}`,
      recordVersion: keyRecord.recordVersion,
      dataKeyVersion: envelope.dataKeyVersion
    })
  });
}

async function validateEncryptedRecords(
  provider: KeyEnvelopeProvider,
  scope: SessionSecretScope,
  envelope: SessionEnvelopeRecord,
  credential: SessionCredentialRecord | null,
  keys: readonly SessionKeyRecord[]
): Promise<void> {
  assertScope(envelope, scope);
  const dataKey = await unwrapDataKey(provider, envelope);
  try {
    if (credential) {
      const plaintext = decryptCredential(scope, envelope, credential, dataKey);
      zeroize(plaintext);
    }
    for (const key of keys) {
      const plaintext = decryptKey(scope, envelope, key, dataKey);
      zeroize(plaintext);
    }
  } catch (error) {
    if (error instanceof SessionStoreError) {
      throw new SessionStoreError("BACKUP_CORRUPTED", "Backup criptográfico corrompido.");
    }
    throw error;
  } finally {
    zeroize(dataKey);
  }
}

function validateBackup(backup: EncryptedSessionBackup): void {
  if (backup.schemaVersion !== SESSION_STORE_SCHEMA_VERSION) {
    throw new SessionStoreError(
      "UNSUPPORTED_SCHEMA_VERSION",
      "Versão do backup de sessão não suportada."
    );
  }
  const { manifestSha256, ...withoutManifest } = backup;
  if (backupManifestSha256(withoutManifest) !== manifestSha256) {
    throw new SessionStoreError("BACKUP_CORRUPTED", "Manifesto do backup não confere.");
  }
}

function backupManifestSha256(
  backup: Omit<EncryptedSessionBackup, "manifestSha256">
): string {
  return sha256Hex(JSON.stringify({
    credential: backup.credential,
    envelope: backup.envelope,
    exportedAt: backup.exportedAt,
    keys: [...backup.keys].sort(compareKeyRecords),
    schemaVersion: backup.schemaVersion,
    scope: backup.scope
  }));
}

function validateScope(scope: SessionSecretScope): void {
  if (
    !scope.organizationId.trim() ||
    !scope.sessionId.trim() ||
    !scope.channelAccountId.trim() ||
    scope.providerType !== SESSION_STORE_PROVIDER_TYPE
  ) {
    throw new SessionStoreError("INVALID_SCOPE", "Escopo de sessão inválido.");
  }
}

function assertScope(record: SessionSecretScope, scope: SessionSecretScope): void {
  if (
    record.organizationId !== scope.organizationId ||
    record.sessionId !== scope.sessionId ||
    record.channelAccountId !== scope.channelAccountId ||
    record.providerType !== scope.providerType
  ) {
    throw new SessionStoreError(
      "INVALID_SCOPE",
      "Sessão fora do escopo de organização, conta ou provider."
    );
  }
}

function assertGeneration(generation: number): void {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new SessionStoreError("GENERATION_CONFLICT", "Geração esperada inválida.");
  }
}

function assertExpectedGeneration(
  envelope: SessionEnvelopeRecord,
  expectedGeneration: number
): void {
  assertGeneration(expectedGeneration);
  if (envelope.generation !== expectedGeneration) {
    throw new SessionStoreError(
      "GENERATION_CONFLICT",
      "A sessão foi modificada por outra transação.",
      true
    );
  }
}

function validateMaterial(material: Uint8Array): void {
  if (material.byteLength === 0 || material.byteLength > MAX_SECRET_BYTES) {
    throw new SessionStoreError(
      "INVALID_SECRET_MATERIAL",
      "Material de sessão vazio ou acima do limite permitido."
    );
  }
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  const result = new Set<string>();
  for (const value of values) {
    if (!value.trim()) {
      throw new SessionStoreError("INVALID_SECRET_MATERIAL", "Identificador de key vazio.");
    }
    result.add(value);
  }
  return [...result];
}

function versionFrom(
  envelope: SessionEnvelopeRecord,
  recordVersion: number,
  updatedAt: string
): CredentialVersion {
  return {
    generation: envelope.generation,
    recordVersion,
    dataKeyVersion: envelope.dataKeyVersion,
    updatedAt
  };
}

async function appendAudit(
  transaction: SessionRepositoryTransaction,
  input: {
    scope: SessionSecretScope;
    action: SessionSecretAuditAction;
    outcome: SessionSecretAuditEvent["outcome"];
    generation: number | null;
    audit?: SessionAuditContext;
    idGenerator: () => string;
    clock: () => Date;
    attributes: SessionSecretAuditEvent["attributes"];
  }
): Promise<void> {
  await transaction.appendAudit({
    ...input.scope,
    eventId: input.idGenerator(),
    action: input.action,
    outcome: input.outcome,
    occurredAt: input.clock().toISOString(),
    correlationId: input.audit?.correlationId ?? null,
    actorId: input.audit?.actorId ?? null,
    generation: input.generation,
    attributes: { ...input.attributes }
  });
}

function compareKeyRecords(left: SessionKeyRecord, right: SessionKeyRecord): number {
  return `${left.category}\u0000${left.keyId}`.localeCompare(
    `${right.category}\u0000${right.keyId}`
  );
}

function cloneEnvelope(record: SessionEnvelopeRecord): SessionEnvelopeRecord {
  return { ...record, wrappedDataKey: { ...record.wrappedDataKey } };
}

function cloneCredential(record: SessionCredentialRecord): SessionCredentialRecord {
  return { ...record, encryptedPayload: { ...record.encryptedPayload } };
}

function cloneKey(record: SessionKeyRecord): SessionKeyRecord {
  return { ...record, encryptedPayload: { ...record.encryptedPayload } };
}
