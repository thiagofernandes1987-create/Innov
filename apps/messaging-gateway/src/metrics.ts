export class GatewayMetrics {
  private requests = 0;
  private authenticatedCommands = 0;
  private authenticationFailures = 0;
  private replayRejections = 0;
  private fakeCommands = 0;
  private inflight = 0;
  private ready = false;
  private readonly startedAtSeconds = Math.floor(Date.now() / 1_000);

  beginRequest(): () => void {
    this.requests += 1;
    this.inflight += 1;
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.inflight = Math.max(0, this.inflight - 1);
    };
  }

  markReady(value: boolean): void { this.ready = value; }
  countAuthenticatedCommand(): void { this.authenticatedCommands += 1; }
  countAuthenticationFailure(): void { this.authenticationFailures += 1; }
  countReplayRejection(): void { this.replayRejections += 1; }
  countFakeCommand(): void { this.fakeCommands += 1; }

  render(): string {
    const lines = [
      "# HELP innov_gateway_up Whether the process is running.",
      "# TYPE innov_gateway_up gauge",
      "innov_gateway_up 1",
      "# HELP innov_gateway_ready Whether the gateway accepts commands.",
      "# TYPE innov_gateway_ready gauge",
      `innov_gateway_ready ${this.ready ? 1 : 0}`,
      "# HELP innov_gateway_http_requests_total Total HTTP requests.",
      "# TYPE innov_gateway_http_requests_total counter",
      `innov_gateway_http_requests_total ${this.requests}`,
      "# HELP innov_gateway_authenticated_commands_total Authenticated internal commands.",
      "# TYPE innov_gateway_authenticated_commands_total counter",
      `innov_gateway_authenticated_commands_total ${this.authenticatedCommands}`,
      "# HELP innov_gateway_authentication_failures_total Rejected authentication attempts.",
      "# TYPE innov_gateway_authentication_failures_total counter",
      `innov_gateway_authentication_failures_total ${this.authenticationFailures}`,
      "# HELP innov_gateway_replay_rejections_total Rejected stale or repeated requests.",
      "# TYPE innov_gateway_replay_rejections_total counter",
      `innov_gateway_replay_rejections_total ${this.replayRejections}`,
      "# HELP innov_gateway_fake_commands_total Commands handled by the fake client.",
      "# TYPE innov_gateway_fake_commands_total counter",
      `innov_gateway_fake_commands_total ${this.fakeCommands}`,
      "# HELP innov_gateway_inflight_requests Current requests.",
      "# TYPE innov_gateway_inflight_requests gauge",
      `innov_gateway_inflight_requests ${this.inflight}`,
      "# HELP innov_gateway_process_start_time_seconds Process start time.",
      "# TYPE innov_gateway_process_start_time_seconds gauge",
      `innov_gateway_process_start_time_seconds ${this.startedAtSeconds}`
    ];
    return `${lines.join("\n")}\n`;
  }
}
