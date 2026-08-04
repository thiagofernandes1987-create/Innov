import { assign, setup } from "xstate";

export type EventTransportContext = {
  attempts: number;
  maxAttempts: number;
  leaseOwner?: string;
  lastError?: string;
};
export type EventTransportEvent =
  | { type: "CLAIM"; worker: string }
  | { type: "PUBLISH_OK" }
  | { type: "PUBLISH_FAILED"; error: string }
  | { type: "LEASE_EXPIRED" }
  | { type: "REPLAY" }
  | { type: "RESOLVE" };

export const eventTransportMachine = setup({
  types: {} as { context: EventTransportContext; events: EventTransportEvent },
  guards: {
    mayRetry: ({ context }) => context.attempts + 1 < context.maxAttempts,
  },
  actions: {
    claim: assign({
      attempts: ({ context }) => context.attempts + 1,
      leaseOwner: ({ event }) => event.type === "CLAIM" ? event.worker : undefined,
    }),
    storeError: assign({
      lastError: ({ event }) => event.type === "PUBLISH_FAILED" ? event.error : undefined,
      leaseOwner: undefined,
    }),
    clearLease: assign({ leaseOwner: undefined }),
  },
}).createMachine({
  id: "eventTransport.v1",
  initial: "pending",
  states: {
    pending: { on: { CLAIM: { target: "leased", actions: "claim" } } },
    leased: {
      on: {
        PUBLISH_OK: { target: "published", actions: "clearLease" },
        PUBLISH_FAILED: [
          { target: "retryWaiting", guard: "mayRetry", actions: "storeError" },
          { target: "deadLetter", actions: "storeError" },
        ],
        LEASE_EXPIRED: { target: "pending", actions: "clearLease" },
      },
    },
    retryWaiting: { on: { CLAIM: { target: "leased", actions: "claim" } } },
    deadLetter: { on: { REPLAY: "pending", RESOLVE: "resolved" } },
    published: { type: "final" },
    resolved: { type: "final" },
  },
});
