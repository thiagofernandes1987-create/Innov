import { loadGatewayConfig } from "./config.js";
import { createGatewayRuntime } from "./server.js";

async function main(): Promise<void> {
  const config = loadGatewayConfig();
  const runtime = createGatewayRuntime(config);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(JSON.stringify({
      level: "info",
      event: "gateway_shutdown_started",
      signal,
      instanceId: config.instanceId
    }));
    await runtime.stop(signal);
    console.info(JSON.stringify({
      level: "info",
      event: "gateway_shutdown_completed",
      instanceId: config.instanceId
    }));
  };

  process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.once("SIGINT", () => { void shutdown("SIGINT"); });

  const address = await runtime.start();
  console.info(JSON.stringify({
    level: "info",
    event: "gateway_started",
    instanceId: config.instanceId,
    host: address.host,
    port: address.port,
    channelClient: "fake"
  }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    level: "error",
    event: "gateway_start_failed",
    message: error instanceof Error ? error.message : "UNKNOWN_ERROR"
  }));
  process.exitCode = 1;
});
