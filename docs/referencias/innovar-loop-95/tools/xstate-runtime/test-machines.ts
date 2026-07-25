import { createActor } from "xstate";
import { eventTransportMachine } from "../../03-statecharts/xstate/event-transport.machine.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const actor=createActor(eventTransportMachine,{input:undefined as never});
actor.start();
assert(actor.getSnapshot().value === "pending", "initial pending");
actor.send({type:"CLAIM",worker:"worker-a"});
assert(actor.getSnapshot().value === "leased", "claim leased");
actor.send({type:"PUBLISH_FAILED",error:"broker unavailable"});
assert(actor.getSnapshot().value === "retryWaiting", "retry waiting");
actor.send({type:"CLAIM",worker:"worker-b"});
actor.send({type:"PUBLISH_FAILED",error:"broker unavailable"});
assert(actor.getSnapshot().value === "deadLetter", "dead letter after max attempts");
actor.send({type:"REPLAY"});
assert(actor.getSnapshot().value === "pending", "replay returns pending");
console.log("XSTATE_RUNTIME: PASS eventTransport.v1 transitions executed");
