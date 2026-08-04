import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap
} from "@whiskeysockets/baileys";
import type {
  SessionAuditContext,
  SessionCredentialStore,
  SessionKeyCategory,
  SessionSecretScope
} from "../../session-store/index.js";

export type StoredBaileysAuthenticationState = {
  state: AuthenticationState;
  saveCreds: (audit?: SessionAuditContext) => Promise<void>;
  currentGeneration: () => number;
};

export async function createStoredBaileysAuthenticationState(input: {
  store: SessionCredentialStore;
  scope: SessionSecretScope;
  audit?: SessionAuditContext;
}): Promise<StoredBaileysAuthenticationState> {
  let generation = 0;
  let credentials: AuthenticationCreds;
  const snapshot = await input.store.loadCredentials(input.scope, input.audit);
  if (snapshot) {
    credentials = decodeJsonBuffer<AuthenticationCreds>(snapshot.material);
    generation = snapshot.generation;
  } else {
    credentials = initAuthCreds();
    const created = await input.store.compareAndSwapCredentials(
      {
        ...input.scope,
        expectedGeneration: null,
        encoding: "JSON_BUFFER_V1",
        material: encodeJsonBuffer(credentials)
      },
      input.audit
    );
    generation = created.generation;
  }

  const state: AuthenticationState = {
    creds: credentials,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const result = await input.store.getKeys(
          {
            ...input.scope,
            category: type as SessionKeyCategory,
            keyIds: ids
          },
          input.audit
        );
        generation = result.generation;
        const decoded: Partial<Record<string, SignalDataTypeMap[T]>> = {};
        for (const [keyId, entry] of Object.entries(result.entries)) {
          let value: unknown = decodeJsonBuffer<unknown>(entry.material);
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(
              value as proto.Message.IAppStateSyncKeyData
            );
          }
          decoded[keyId] = value as SignalDataTypeMap[T];
        }
        return decoded as { [id: string]: SignalDataTypeMap[T] };
      },
      set: async (data: SignalDataSet) => {
        const categories = Object.keys(data) as Array<keyof SignalDataTypeMap>;
        for (const category of categories) {
          const values = data[category] as Record<string, unknown | null> | undefined;
          if (!values) continue;
          const result = await input.store.setKeys(
            {
              ...input.scope,
              category: category as SessionKeyCategory,
              expectedGeneration: generation,
              entries: Object.entries(values).map(([keyId, value]) => ({
                keyId,
                encoding: "JSON_BUFFER_V1" as const,
                material: value === null ? null : encodeJsonBuffer(value)
              }))
            },
            input.audit
          );
          generation = result.generation;
        }
      },
      clear: async () => {
        await input.store.deleteSessionSecrets(
          input.scope,
          generation,
          input.audit
        );
        generation = 0;
      }
    }
  };

  return {
    state,
    saveCreds: async audit => {
      const result = await input.store.compareAndSwapCredentials(
        {
          ...input.scope,
          expectedGeneration: generation === 0 ? null : generation,
          encoding: "JSON_BUFFER_V1",
          material: encodeJsonBuffer(credentials)
        },
        audit ?? input.audit
      );
      generation = result.generation;
    },
    currentGeneration: () => generation
  };
}

function encodeJsonBuffer(value: unknown): Uint8Array {
  return Buffer.from(JSON.stringify(value, BufferJSON.replacer), "utf8");
}

function decodeJsonBuffer<T>(value: Uint8Array): T {
  return JSON.parse(Buffer.from(value).toString("utf8"), BufferJSON.reviver) as T;
}
