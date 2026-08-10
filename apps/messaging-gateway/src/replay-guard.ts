export class GatewayReplayError extends Error {
  constructor(public readonly code: "STALE_REQUEST" | "REPLAY_DETECTED" | "REPLAY_CAPACITY") {
    super(code);
    this.name = "GatewayReplayError";
  }
}

export type ReplayGuardOptions = {
  windowSeconds: number;
  maxEntries: number;
  now?: () => number;
};

export class ReplayGuard {
  private readonly nonces = new Map<string, number>();
  private readonly now: () => number;

  constructor(private readonly options: ReplayGuardOptions) {
    this.now = options.now ?? Date.now;
  }

  assertFreshAndRemember(nonce: string, timestampText: string): void {
    if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(nonce)) {
      throw new GatewayReplayError("STALE_REQUEST");
    }
    if (!/^\d{10,13}$/.test(timestampText)) {
      throw new GatewayReplayError("STALE_REQUEST");
    }

    const rawTimestamp = Number(timestampText);
    const timestampMs = timestampText.length === 10 ? rawTimestamp * 1_000 : rawTimestamp;
    const nowMs = this.now();
    const windowMs = this.options.windowSeconds * 1_000;
    if (!Number.isSafeInteger(timestampMs) || Math.abs(nowMs - timestampMs) > windowMs) {
      throw new GatewayReplayError("STALE_REQUEST");
    }

    this.purge(nowMs);
    if (this.nonces.has(nonce)) throw new GatewayReplayError("REPLAY_DETECTED");
    if (this.nonces.size >= this.options.maxEntries) {
      throw new GatewayReplayError("REPLAY_CAPACITY");
    }
    this.nonces.set(nonce, nowMs + windowMs);
  }

  size(): number {
    this.purge(this.now());
    return this.nonces.size;
  }

  private purge(nowMs: number): void {
    for (const [nonce, expiresAt] of this.nonces) {
      if (expiresAt <= nowMs) this.nonces.delete(nonce);
    }
  }
}
