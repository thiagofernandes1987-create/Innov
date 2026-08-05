import { describe, expect, it } from "vitest";
import {
  SessionStoreError,
  TestOnlyInMemoryKeyEnvelopeProvider,
  TransactionalMemorySessionCredentialRepository,
  createEncryptedSessionCredentialStore,
  type EncryptedSessionBackup,
  type SessionSecretScope
} from "../apps/messaging-gateway/src/session-store/index";
import { createStoredBaileysAuthenticationState } from "../apps/messaging-gateway/src/engines/baileys/stored-auth-state";

const SECRET_TEXT = "synthetic-credential-secret-never-log";
const scope: SessionSecretScope = {
  organizationId: "11111111-1111-1111-1111-111111111111",
  sessionId: "71000000-0000-0000-0000-000000000001",
  channelAccountId: "10000000-0000-0000-0000-000000000001",
  providerType: "WHATSAPP_WEB_BAILEYS"
};

function fixture(input?: { keyId?: string; keyVersion?: number; fill?: number }) {
  const repository = new TransactionalMemorySessionCredentialRepository();
  const keyEnvelopeProvider = new TestOnlyInMemoryKeyEnvelopeProvider({
    allowTestOnly: true,
    keyId: input?.keyId ?? "test-kek-a",
    keyVersion: input?.keyVersion ?? 1,
    keyMaterial: new Uint8Array(32).fill(input?.fill ?? 7)
  });
  const store = createEncryptedSessionCredentialStore({
    repository,
    keyEnvelopeProvider
  });
  return { repository, keyEnvelopeProvider, store };
}

function bytes(value: string): Uint8Array {
  return Buffer.from(value, "utf8");
}

function text(value: Uint8Array): string {
  return Buffer.from(value).toString("utf8");
}

describe("SessionCredentialStore W-07", () => {
  it("grava e carrega credenciais por compare-and-swap", async () => {
    const { store } = fixture();
    const version = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    expect(version.generation).toBe(1);
    expect(version.dataKeyVersion).toBe(1);

    const snapshot = await store.loadCredentials(scope);
    expect(snapshot?.generation).toBe(1);
    expect(snapshot?.recordVersion).toBe(1);
    expect(text(snapshot!.material)).toBe(SECRET_TEXT);
  });

  it("rejeita geração obsoleta sem alterar o registro", async () => {
    const { store } = fixture();
    await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes("v1")
    });
    await expect(store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: 0,
      encoding: "BINARY",
      material: bytes("stale")
    })).rejects.toMatchObject({ code: "GENERATION_CONFLICT", retryable: true });
    expect(text((await store.loadCredentials(scope))!.material)).toBe("v1");
  });

  it("permite somente um vencedor em escritas concorrentes", async () => {
    const { store } = fixture();
    const initial = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes("initial")
    });
    const results = await Promise.allSettled([
      store.compareAndSwapCredentials({
        ...scope,
        expectedGeneration: initial.generation,
        encoding: "BINARY",
        material: bytes("writer-a")
      }),
      store.compareAndSwapCredentials({
        ...scope,
        expectedGeneration: initial.generation,
        encoding: "BINARY",
        material: bytes("writer-b")
      })
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find(result => result.status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ code: "GENERATION_CONFLICT" })
    });
  });

  it("usa DEK distinta por sessão e não persiste plaintext", async () => {
    const { repository, store } = fixture();
    const second = { ...scope, sessionId: "72000000-0000-0000-0000-000000000002" };
    await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    await store.compareAndSwapCredentials({
      ...second,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    const firstRaw = await repository.snapshotSession(scope.sessionId);
    const secondRaw = await repository.snapshotSession(second.sessionId);
    expect(firstRaw.envelope?.wrappedDataKey.ciphertext)
      .not.toBe(secondRaw.envelope?.wrappedDataKey.ciphertext);
    expect(firstRaw.credential?.encryptedPayload.ciphertext)
      .not.toBe(secondRaw.credential?.encryptedPayload.ciphertext);
    expect(JSON.stringify(firstRaw)).not.toContain(SECRET_TEXT);
  });

  it("grava, lê e remove keys em transação", async () => {
    const { store } = fixture();
    const created = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes("creds")
    });
    const write = await store.setKeys({
      ...scope,
      category: "session",
      expectedGeneration: created.generation,
      entries: [
        { keyId: "device-a", encoding: "BINARY", material: bytes("key-a") },
        { keyId: "device-b", encoding: "BINARY", material: bytes("key-b") }
      ]
    });
    expect(write.changed).toBe(2);
    const read = await store.getKeys({
      ...scope,
      category: "session",
      keyIds: ["device-a", "device-b", "missing"]
    });
    expect(text(read.entries["device-a"]!.material)).toBe("key-a");
    expect(text(read.entries["device-b"]!.material)).toBe("key-b");

    const removed = await store.setKeys({
      ...scope,
      category: "session",
      expectedGeneration: read.generation,
      entries: [{ keyId: "device-a", encoding: "BINARY", material: null }]
    });
    expect(removed.deleted).toBe(1);
    const after = await store.getKeys({
      ...scope,
      category: "session",
      keyIds: ["device-a", "device-b"]
    });
    expect(after.entries["device-a"]).toBeUndefined();
    expect(text(after.entries["device-b"]!.material)).toBe("key-b");
  });

  it("faz rollback integral quando um batch contém identificador duplicado", async () => {
    const { store } = fixture();
    const created = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes("creds")
    });
    await expect(store.setKeys({
      ...scope,
      category: "pre-key",
      expectedGeneration: created.generation,
      entries: [
        { keyId: "same", encoding: "BINARY", material: bytes("a") },
        { keyId: "same", encoding: "BINARY", material: bytes("b") }
      ]
    })).rejects.toMatchObject({ code: "INVALID_SECRET_MATERIAL" });
    const after = await store.getKeys({
      ...scope,
      category: "pre-key",
      keyIds: ["same"]
    });
    expect(after.entries).toEqual({});
    expect(after.generation).toBe(created.generation);
  });

  it("rotaciona a DEK e recriptografa todos os registros", async () => {
    const { repository, store } = fixture();
    const created = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    const keys = await store.setKeys({
      ...scope,
      category: "sender-key",
      expectedGeneration: created.generation,
      entries: [{ keyId: "group-a", encoding: "BINARY", material: bytes("sender-secret") }]
    });
    const before = await repository.snapshotSession(scope.sessionId);
    const rotated = await store.rotateSessionDataKey(scope, keys.generation);
    const after = await repository.snapshotSession(scope.sessionId);
    expect(rotated.dataKeyVersion).toBe(2);
    expect(after.envelope?.wrappedDataKey.ciphertext)
      .not.toBe(before.envelope?.wrappedDataKey.ciphertext);
    expect(after.credential?.encryptedPayload.ciphertext)
      .not.toBe(before.credential?.encryptedPayload.ciphertext);
    expect(after.keys[0]?.encryptedPayload.ciphertext)
      .not.toBe(before.keys[0]?.encryptedPayload.ciphertext);
    expect(text((await store.loadCredentials(scope))!.material)).toBe(SECRET_TEXT);
  });

  it("rewrapa a DEK sob nova KEK sem recriptografar o payload", async () => {
    const { repository, keyEnvelopeProvider, store } = fixture();
    const created = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    const before = await repository.snapshotSession(scope.sessionId);
    keyEnvelopeProvider.addKey("test-kek-b", 2, new Uint8Array(32).fill(9));
    keyEnvelopeProvider.setActiveKey("test-kek-b", 2);
    await store.rewrapSessionDataKey(scope, created.generation);
    const after = await repository.snapshotSession(scope.sessionId);
    expect(after.envelope?.wrappedDataKey.keyId).toBe("test-kek-b");
    expect(after.envelope?.wrappedDataKey.ciphertext)
      .not.toBe(before.envelope?.wrappedDataKey.ciphertext);
    expect(after.credential?.encryptedPayload.ciphertext)
      .toBe(before.credential?.encryptedPayload.ciphertext);
    expect(text((await store.loadCredentials(scope))!.material)).toBe(SECRET_TEXT);
  });

  it("exporta backup cifrado e restaura sem plaintext", async () => {
    const source = fixture();
    const created = await source.store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    await source.store.setKeys({
      ...scope,
      category: "identity-key",
      expectedGeneration: created.generation,
      entries: [{ keyId: "identity", encoding: "BINARY", material: bytes("identity-secret") }]
    });
    const backup = await source.store.exportEncryptedBackup(scope);
    expect(JSON.stringify(backup)).not.toContain(SECRET_TEXT);
    expect(JSON.stringify(backup)).not.toContain("identity-secret");

    const targetRepository = new TransactionalMemorySessionCredentialRepository();
    const targetStore = createEncryptedSessionCredentialStore({
      repository: targetRepository,
      keyEnvelopeProvider: source.keyEnvelopeProvider
    });
    await targetStore.restoreEncryptedBackup(backup, null);
    expect(text((await targetStore.loadCredentials(scope))!.material)).toBe(SECRET_TEXT);
    const keys = await targetStore.getKeys({
      ...scope,
      category: "identity-key",
      keyIds: ["identity"]
    });
    expect(text(keys.entries["identity"]!.material)).toBe("identity-secret");
  });

  it("rejeita backup adulterado sem restauração parcial", async () => {
    const source = fixture();
    await source.store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    const backup = await source.store.exportEncryptedBackup(scope);
    const corrupted: EncryptedSessionBackup = {
      ...backup,
      credential: backup.credential
        ? {
            ...backup.credential,
            encryptedPayload: {
              ...backup.credential.encryptedPayload,
              ciphertext: `${backup.credential.encryptedPayload.ciphertext}A`
            }
          }
        : null
    };
    const target = fixture();
    await expect(target.store.restoreEncryptedBackup(corrupted, null))
      .rejects.toMatchObject({ code: "BACKUP_CORRUPTED" });
    expect(await target.store.loadCredentials(scope)).toBeNull();
  });

  it("falha fechado quando a KEK correta não está disponível", async () => {
    const source = fixture();
    await source.store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    });
    const backup = await source.store.exportEncryptedBackup(scope);
    const target = fixture({ keyId: "test-kek-a", keyVersion: 1, fill: 11 });
    await expect(target.store.restoreEncryptedBackup(backup, null))
      .rejects.toBeInstanceOf(SessionStoreError);
    expect(await target.store.loadCredentials(scope)).toBeNull();
  });

  it("realiza exclusão criptográfica e preserva somente auditoria sanitizada", async () => {
    const { repository, store } = fixture();
    const created = await store.compareAndSwapCredentials({
      ...scope,
      expectedGeneration: null,
      encoding: "BINARY",
      material: bytes(SECRET_TEXT)
    }, { correlationId: "corr-delete", actorId: "operator-test" });
    await store.deleteSessionSecrets(scope, created.generation, {
      correlationId: "corr-delete",
      actorId: "operator-test"
    });
    expect(await store.loadCredentials(scope)).toBeNull();
    const raw = await repository.snapshotSession(scope.sessionId);
    expect(raw.envelope).toBeNull();
    expect(raw.credential).toBeNull();
    expect(raw.keys).toHaveLength(0);
    const audit = await store.listAuditEvents(scope.sessionId);
    expect(audit.at(-1)?.action).toBe("SESSION_SECRETS_DELETED");
    expect(JSON.stringify(audit)).not.toContain(SECRET_TEXT);
    expect(JSON.stringify(audit)).not.toContain("ciphertext");
    expect(JSON.stringify(audit)).not.toContain("wrappedDataKey");
  });

  it("integra AuthenticationState sem arquivos nem socket", async () => {
    const { store } = fixture();
    const bridge = await createStoredBaileysAuthenticationState({ store, scope });
    expect(bridge.currentGeneration()).toBe(1);
    bridge.state.creds.registered = true;
    await bridge.saveCreds();
    expect(bridge.currentGeneration()).toBe(2);

    await bridge.state.keys.set({
      "lid-mapping": { "5511999990001": "1234567890" }
    });
    const mappings = await bridge.state.keys.get("lid-mapping", ["5511999990001"]);
    expect(mappings["5511999990001"]).toBe("1234567890");

    const restored = await createStoredBaileysAuthenticationState({ store, scope });
    expect(restored.state.creds.registered).toBe(true);
    expect(restored.currentGeneration()).toBeGreaterThan(2);
    await restored.state.keys.clear?.();
    expect(await store.loadCredentials(scope)).toBeNull();
  });
});
