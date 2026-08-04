import { runSyntheticBenchmark } from "../lib/messaging/verification.ts";

const result = runSyntheticBenchmark(20_000, 200);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
