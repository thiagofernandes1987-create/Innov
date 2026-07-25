import { setup, assign } from "xstate";

type Ctx = { elapsedBusinessSeconds: number; targetSeconds: number; pauseReason?: string };
type Ev =
 | {type:"START"}
 | {type:"TICK"; seconds:number}
 | {type:"PAUSE"; reason:string}
 | {type:"RESUME"}
 | {type:"COMPLETE"}
 | {type:"CANCEL"};

export const slaMachine = setup({
  types: {} as {context:Ctx; events:Ev},
  guards:{
    breached:({context,event}) => event.type==="TICK" &&
      context.elapsedBusinessSeconds + event.seconds >= context.targetSeconds,
    hasReason:({event}) => event.type==="PAUSE" && event.reason.trim().length>=3
  },
  actions:{
    addTime:assign({elapsedBusinessSeconds:({context,event}) =>
      event.type==="TICK" ? context.elapsedBusinessSeconds + event.seconds : context.elapsedBusinessSeconds}),
    storePause:assign({pauseReason:({event})=>event.type==="PAUSE"?event.reason:undefined}),
    clearPause:assign({pauseReason:()=>undefined})
  }
}).createMachine({
  id:"sla.v1",
  initial:"IDLE",
  states:{
    IDLE:{on:{START:"RUNNING"}},
    RUNNING:{on:{
      TICK:[
        {target:"BREACHED",guard:"breached",actions:"addTime"},
        {target:"RUNNING",actions:"addTime"}
      ],
      PAUSE:{target:"PAUSED",guard:"hasReason",actions:"storePause"},
      COMPLETE:"COMPLETED",
      CANCEL:"CANCELED"
    }},
    PAUSED:{on:{RESUME:{target:"RUNNING",actions:"clearPause"},CANCEL:"CANCELED"}},
    BREACHED:{on:{COMPLETE:"COMPLETED",PAUSE:{target:"PAUSED",guard:"hasReason",actions:"storePause"}}},
    COMPLETED:{type:"final"},
    CANCELED:{type:"final"}
  }
});
