import type {
  SessionCredentialRecord,
  SessionCredentialRepository,
  SessionEnvelopeRecord,
  SessionKeyCategory,
  SessionKeyRecord,
  SessionRepositoryTransaction,
  SessionSecretAuditEvent
} from "./contracts.js";

type RepositoryState = {
  envelopes: Map<string, SessionEnvelopeRecord>;
  credentials: Map<string, SessionCredentialRecord>;
  keys: Map<string, SessionKeyRecord>;
  audit: SessionSecretAuditEvent[];
};

export class TransactionalMemorySessionCredentialRepository
  implements SessionCredentialRepository {
  private state: RepositoryState = emptyState();
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(
    operation: (transaction: SessionRepositoryTransaction) => Promise<T>
  ): Promise<T> {
    let release: (() => void) | undefined;
    const previous = this.tail;
    this.tail = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;

    const candidate = cloneState(this.state);
    const transaction = createTransaction(candidate);
    try {
      const result = await operation(transaction);
      this.state = candidate;
      return result;
    } finally {
      release?.();
    }
  }

  async listAuditEvents(sessionId: string): Promise<readonly SessionSecretAuditEvent[]> {
    return this.state.audit
      .filter(event => event.sessionId === sessionId)
      .map(cloneAuditEvent);
  }

  async snapshotSession(sessionId: string): Promise<{
    envelope: SessionEnvelopeRecord | null;
    credential: SessionCredentialRecord | null;
    keys: readonly SessionKeyRecord[];
  }> {
    const envelope = this.state.envelopes.get(sessionId);
    const credential = this.state.credentials.get(sessionId);
    return {
      envelope: envelope ? cloneEnvelope(envelope) : null,
      credential: credential ? cloneCredential(credential) : null,
      keys: [...this.state.keys.values()]
        .filter(record => record.sessionId === sessionId)
        .map(cloneKey)
    };
  }
}

function createTransaction(state: RepositoryState): SessionRepositoryTransaction {
  return {
    async getEnvelope(sessionId) {
      const record = state.envelopes.get(sessionId);
      return record ? cloneEnvelope(record) : null;
    },
    async putEnvelope(record) {
      state.envelopes.set(record.sessionId, cloneEnvelope(record));
    },
    async deleteEnvelope(sessionId) {
      state.envelopes.delete(sessionId);
    },
    async getCredential(sessionId) {
      const record = state.credentials.get(sessionId);
      return record ? cloneCredential(record) : null;
    },
    async putCredential(record) {
      state.credentials.set(record.sessionId, cloneCredential(record));
    },
    async deleteCredential(sessionId) {
      state.credentials.delete(sessionId);
    },
    async getKey(sessionId, category, keyId) {
      const record = state.keys.get(keyReference(sessionId, category, keyId));
      return record ? cloneKey(record) : null;
    },
    async listKeys(sessionId) {
      return [...state.keys.values()]
        .filter(record => record.sessionId === sessionId)
        .map(cloneKey);
    },
    async putKey(record) {
      state.keys.set(
        keyReference(record.sessionId, record.category, record.keyId),
        cloneKey(record)
      );
    },
    async deleteKey(sessionId, category, keyId) {
      state.keys.delete(keyReference(sessionId, category, keyId));
    },
    async deleteKeys(sessionId) {
      for (const [reference, record] of state.keys.entries()) {
        if (record.sessionId === sessionId) state.keys.delete(reference);
      }
    },
    async appendAudit(event) {
      state.audit.push(cloneAuditEvent(event));
    }
  };
}

function emptyState(): RepositoryState {
  return {
    envelopes: new Map(),
    credentials: new Map(),
    keys: new Map(),
    audit: []
  };
}

function cloneState(state: RepositoryState): RepositoryState {
  return {
    envelopes: new Map(
      [...state.envelopes.entries()].map(([key, value]) => [key, cloneEnvelope(value)])
    ),
    credentials: new Map(
      [...state.credentials.entries()].map(([key, value]) => [key, cloneCredential(value)])
    ),
    keys: new Map(
      [...state.keys.entries()].map(([key, value]) => [key, cloneKey(value)])
    ),
    audit: state.audit.map(cloneAuditEvent)
  };
}

function keyReference(
  sessionId: string,
  category: SessionKeyCategory,
  keyId: string
): string {
  return `${sessionId}\u0000${category}\u0000${keyId}`;
}

function cloneEnvelope(record: SessionEnvelopeRecord): SessionEnvelopeRecord {
  return {
    ...record,
    wrappedDataKey: { ...record.wrappedDataKey }
  };
}

function cloneCredential(record: SessionCredentialRecord): SessionCredentialRecord {
  return {
    ...record,
    encryptedPayload: { ...record.encryptedPayload }
  };
}

function cloneKey(record: SessionKeyRecord): SessionKeyRecord {
  return {
    ...record,
    encryptedPayload: { ...record.encryptedPayload }
  };
}

function cloneAuditEvent(event: SessionSecretAuditEvent): SessionSecretAuditEvent {
  return {
    ...event,
    attributes: { ...event.attributes }
  };
}
