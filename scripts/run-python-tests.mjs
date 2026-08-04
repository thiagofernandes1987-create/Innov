import { spawnSync } from "node:child_process";
import path from "node:path";

const command = process.platform === "win32" ? "python" : "python3";
const pythonPath = ["python", process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);

const result = spawnSync(
  command,
  ["-m", "unittest", "discover", "-s", "python/tests", "-v"],
  {
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: pythonPath }
  }
);

if (result.error) {
  console.error(`Não foi possível iniciar ${command}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
