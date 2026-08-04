import { setup, assign } from "xstate";

export type WorkflowContext = {
  expectedVersion: number;
  currentVersion: number;
  hasRequiredFields: boolean;
  amount: number;
  approvalLimit: number;
  reason?: string;
};

export type WorkflowEvent =
  | { type: "SUBMIT" }
  | { type: "APPROVE" }
  | { type: "REJECT"; reason: string }
  | { type: "RETURN"; reason: string }
  | { type: "CANCEL"; reason: string };

export const workflowMachine = setup({
  types: {} as { context: WorkflowContext; events: WorkflowEvent },
  guards: {
    versionMatches: ({ context }) => context.expectedVersion === context.currentVersion,
    hasRequiredFields: ({ context }) => context.hasRequiredFields,
    withinApprovalLimit: ({ context }) => context.amount <= context.approvalLimit,
    hasReason: ({ event }) => "reason" in event && event.reason.trim().length >= 3,
  },
  actions: {
    storeReason: assign({
      reason: ({ event }) => ("reason" in event ? event.reason : undefined),
    }),
  },
}).createMachine({
  id: "genericWorkflow.v1",
  initial: "DRAFT",
  states: {
    DRAFT: {
      on: {
        SUBMIT: {
          target: "SUBMITTED",
          guard: { type: "and", guards: ["versionMatches", "hasRequiredFields"] },
        },
        CANCEL: { target: "CANCELED", guard: "hasReason", actions: "storeReason" },
      },
    },
    SUBMITTED: {
      always: [
        { target: "UNDER_REVIEW", guard: "withinApprovalLimit" },
        { target: "WAITING_APPROVAL" },
      ],
    },
    UNDER_REVIEW: {
      on: {
        APPROVE: { target: "APPROVED", guard: "versionMatches" },
        REJECT: { target: "REJECTED", guard: "hasReason", actions: "storeReason" },
        RETURN: { target: "DRAFT", guard: "hasReason", actions: "storeReason" },
      },
    },
    WAITING_APPROVAL: {
      on: {
        APPROVE: { target: "APPROVED", guard: "versionMatches" },
        REJECT: { target: "REJECTED", guard: "hasReason", actions: "storeReason" },
      },
    },
    APPROVED: { type: "final" },
    REJECTED: { type: "final" },
    CANCELED: { type: "final" },
  },
});
