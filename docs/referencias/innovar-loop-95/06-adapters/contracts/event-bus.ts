export interface EventMessage {
  topic: string;
  partitionKey: string;
  eventId: string;
  payload: unknown;
  headers: Record<string,string>;
}
export interface EventBusAdapter {
  publish(message: EventMessage): Promise<{ providerMessageId: string }>;
  health(): Promise<{ ok: boolean; detail?: string }>;
}
