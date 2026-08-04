import { spawnSync } from "node:child_process";
import fs from "node:fs";

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 120_000,
    ...options
  });
}

function outputOf(result) {
  return [result?.stdout, result?.stderr].filter(Boolean).join("\n").trim();
}

export function runPostgresFiles({
  containerPrefix,
  database,
  files,
  approvalPattern = /NOTICE:.*(aprovad|verificad)/i,
  expectedApprovals = 1,
  successMessage
}) {
  for (const file of files) {
    if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
  }

  const version = docker(["version", "--format", "{{.Server.Version}}"], {
    timeout: 15_000
  });
  if (version.status !== 0) {
    throw new Error(`Docker indisponível: os testes NÃO foram executados.\n${outputOf(version)}`);
  }

  const container = `${containerPrefix}-${process.pid}`;
  if (!/^[a-z0-9][a-z0-9_.-]+$/i.test(container)) {
    throw new Error("Nome de contêiner de teste inválido.");
  }

  let approvals = 0;
  try {
    const started = docker([
      "run", "--detach", "--rm", "--name", container,
      "--env", "POSTGRES_PASSWORD=postgres",
      "--env", `POSTGRES_DB=${database}`,
      "postgres:16-alpine"
    ]);
    if (started.status !== 0) {
      throw new Error(`Não foi possível iniciar PostgreSQL 16.\n${outputOf(started)}`);
    }

    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const logs = docker(["logs", container], { timeout: 5_000 });
      const initializationFinished = `${logs.stdout}\n${logs.stderr}`
        .includes("PostgreSQL init process complete; ready for start up.");
      const status = docker([
        "exec", container, "pg_isready", "-U", "postgres", "-d", database
      ], { timeout: 5_000 });
      // VACINA-020: pg_isready também aprova o servidor temporário do bootstrap.
      if (initializationFinished && status.status === 0) {
        ready = true;
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
    if (!ready) throw new Error("PostgreSQL 16 não ficou pronto a tempo.");

    for (const file of files) {
      const result = docker([
        "exec", "--interactive", container,
        "psql", "-U", "postgres", "-d", database,
        "-v", "ON_ERROR_STOP=1", "-q"
      ], { input: fs.readFileSync(file, "utf8") });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      if (result.status !== 0 || /^ERROR:/m.test(output)) {
        throw new Error(`Falha em ${file}.\n${output.trim()}`);
      }
      for (const line of output.split("\n")) {
        if (approvalPattern.test(line)) {
          approvals += 1;
          console.log(line.trim());
        }
      }
    }

    if (approvals < expectedApprovals) {
      throw new Error(
        `O banco produziu ${approvals} confirmação(ões) de ${expectedApprovals}; os testes não executaram por inteiro.`
      );
    }
    console.log(successMessage);
  } finally {
    docker(["rm", "--force", container], { timeout: 20_000 });
  }
}
