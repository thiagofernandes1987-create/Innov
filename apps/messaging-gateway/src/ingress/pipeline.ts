import type {
  CanonicalIngressEnvelope,
  IngressDispatch,
  IngressFailure,
  IngressRepository,
  PersistedIngressEvent
} from "./contracts.js";

export class IngressPipelineError extends Error {
  constructor(
    readonly code: IngressFailure["code"] | "INGRESS_NOT_PERSISTED",
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "IngressPipelineError";
  }
}

export type IngressPipelineOptions = {
  repository: IngressRepository;
  dispatch: IngressDispatch;
  allowUnknownPayload?: boolean;
};

function validate(envelope: CanonicalIngressEnvelope): void {
  if (
    !envelope.idempotencyKey ||
    envelope.idempotencyKey.length !== 64 ||
    !envelope.organizationId ||
    !envelope.channelAccountId ||
    !envelope.sequenceKey ||
    Number.isNaN(Date.parse(envelope.occurredAt)) ||
    Number.isNaN(Date.parse(envelope.receivedAt))
  ) {
    throw new IngressPipelineError("INVALID_EVENT", "Envelope ingress inválido.");
  }
}

export function assertPersistedBeforeAutomation(event: PersistedIngressEvent): void {
  if (event.state !== "PERSISTED" && event.state !== "DISPATCHED") {
    throw new IngressPipelineError(
      "INGRESS_NOT_PERSISTED",
      "Workflow, regra ou IA não pode executar antes de PERSISTED."
    );
  }
}

export function createIngressPipeline(options: IngressPipelineOptions) {
  return {
    async process(envelope: CanonicalIngressEnvelope): Promise<PersistedIngressEvent> {
      validate(envelope);
      if (envelope.eventKind === "UNKNOWN" && !options.allowUnknownPayload) {
        const failure: IngressFailure = {
          code: "UNKNOWN_PAYLOAD",
          message: "Payload desconhecido foi isolado.",
          retryable: false
        };
        await options.repository.moveToDlq(envelope, failure);
        throw new IngressPipelineError(failure.code, failure.message, failure.retryable);
      }

      let persisted: PersistedIngressEvent;
      try {
        persisted = await options.repository.persist(envelope);
      } catch (error) {
        throw new IngressPipelineError(
          "PERSISTENCE_FAILED",
          error instanceof Error ? error.message : "Falha de persistência ingress.",
          true
        );
      }

      assertPersistedBeforeAutomation(persisted);
      if (!persisted.duplicate || persisted.state !== "DISPATCHED") {
        await options.dispatch(persisted);
        persisted = await options.repository.markDispatched(envelope.idempotencyKey);
      }
      return persisted;
    },

    async replay(idempotencyKey: string): Promise<PersistedIngressEvent> {
      const event = await options.repository.replay(idempotencyKey);
      assertPersistedBeforeAutomation(event);
      await options.dispatch(event);
      return options.repository.markDispatched(idempotencyKey);
    }
  };
}
