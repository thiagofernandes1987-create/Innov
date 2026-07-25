import { setup, assign } from "xstate";

type Ctx = {
  requestedStateVersion: number;
  currentStateVersion: number;
  approvalsRequired: number;
  approvalsReceived: number;
  rejectionReason?: string;
};

type Ev =
 | { type: "REQUEST" }
 | { type: "APPROVE" }
 | { type: "REJECT"; reason: string }
 | { type: "EXPIRE" }
 | { type: "CANCEL"; reason: string }
 | { type: "EXECUTE" };

export const approvalMachine = setup({
  types: {} as { context: Ctx; events: Ev },
  guards: {
    versionMatches: ({context}) => context.requestedStateVersion === context.currentStateVersion,
    quorumReached: ({context}) => context.approvalsReceived + 1 >= context.approvalsRequired,
    hasReason: ({event}) => "reason" in event && event.reason.trim().length >= 3,
  },
  actions: {
    addApproval: assign({ approvalsReceived: ({context}) => context.approvalsReceived + 1 }),
    storeReason: assign({ rejectionReason: ({event}) => "reason" in event ? event.reason : undefined })
  }
}).createMachine({
  id: "approval.v1",
  initial: "DRAFT",
  states: {
    DRAFT: { on: { REQUEST: "PENDING" } },
    PENDING: {
      on: {
        APPROVE: [
          { target: "APPROVED", guard: {type:"and", guards:["versionMatches","quorumReached"]}, actions:"addApproval" },
          { target: "PENDING", guard: "versionMatches", actions:"addApproval" }
        ],
        REJECT: { target:"REJECTED", guard:"hasReason", actions:"storeReason" },
        EXPIRE: "EXPIRED",
        CANCEL: { target:"CANCELED", guard:"hasReason", actions:"storeReason" }
      }
    },
    APPROVED: { on: { EXECUTE: [{target:"EXECUTED", guard:"versionMatches"}, {target:"STALE"}] } },
    EXECUTED: { type:"final" },
    STALE: { type:"final" },
    REJECTED: { type:"final" },
    EXPIRED: { type:"final" },
    CANCELED: { type:"final" }
  }
});
