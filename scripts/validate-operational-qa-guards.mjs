import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDirectory = path.join(root, "supabase", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function collectLatestFunctions() {
  const latest = new Map();
  const pattern = /create\s+or\s+replace\s+function\s+public\.([a-zA-Z0-9_]+)\s*\(([^)]*)\)[\s\S]*?as\s+(\$[a-zA-Z0-9_]*\$)([\s\S]*?)\3\s*;/gi;

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    for (const match of sql.matchAll(pattern)) {
      const [, name, parameters, , body] = match;
      latest.set(name, {
        file,
        parameters: normalize(parameters),
        definition: normalize(match[0]),
        body: normalize(body)
      });
    }
  }

  return latest;
}

const functions = collectLatestFunctions();
const failures = [];

function requireFunction(name) {
  const entry = functions.get(name);
  if (!entry) {
    failures.push(`Definição final ausente para public.${name}.`);
    return null;
  }
  return entry;
}

function requirePattern(entry, pattern, message) {
  if (entry && !pattern.test(entry.definition)) {
    failures.push(`${message} Definição final: ${entry.file}.`);
  }
}

const procurementApproval = requireFunction("decide_procurement_approval");
requirePattern(
  procurementApproval,
  /auth\.uid\(\)\s*=\s*v_approval\.requested_by/i,
  "VACINA-034: seleção e aprovação precisam ser atores distintos."
);
requirePattern(
  procurementApproval,
  /auth\.uid\(\)\s*=\s*v_request\.requested_by/i,
  "VACINA-034: solicitante e aprovador precisam ser atores distintos."
);

const procurementReceipt = requireFunction("finalize_procurement_receipt");
for (const enumType of [
  "procurement_receipt_status",
  "procurement_order_status",
  "procurement_request_status"
]) {
  requirePattern(
    procurementReceipt,
    new RegExp(`::public\\.${enumType}`, "i"),
    `VACINA-035: transição precisa declarar ${enumType}.`
  );
}

const dailyLogDecision = requireFunction("decide_daily_log");
requirePattern(
  dailyLogDecision,
  /::public\.daily_log_status/i,
  "VACINA-035: decisão de diário precisa devolver daily_log_status tipado."
);

const receiptImport = requireFunction("import_procurement_receipt_to_inventory");
requirePattern(
  receiptImport,
  /join\s+public\.procurement_request_items\s+request_item/i,
  "VACINA-036: importação precisa obter a ordem da linha original da solicitação."
);
requirePattern(
  receiptImport,
  /order\s+by\s+request_item\.line_number\s*,\s*receipt_item\.id/i,
  "VACINA-036: linhas importadas precisam usar line_number como ordem canônica."
);
if (receiptImport && /receipt_item\.created_at/i.test(receiptImport.definition)) {
  failures.push(
    `VACINA-036: ${receiptImport.file} voltou a depender de procurement_receipt_items.created_at, coluna inexistente.`
  );
}

const sandboxSignature = requireFunction("sandbox_signature_event_core");
requirePattern(
  sandboxSignature,
  /complete_signature_business_state\s*\(\s*v\.id\s*\)/i,
  "VACINA-033: sandbox precisa concluir o mesmo estado de negócio do provider."
);

const completion = requireFunction("complete_signature_business_state");
requirePattern(
  completion,
  /update\s+public\.contracts\s+set\s+status\s*=\s*'SIGNED'/i,
  "VACINA-033: conclusão precisa assinar o contrato no domínio."
);
requirePattern(
  completion,
  /apply_signed_amendment\s*\(/i,
  "VACINA-033: conclusão precisa aplicar aditivo assinado quando houver."
);

const webhookPath = path.join(root, "app", "api", "signatures", "webhook", "route.ts");
if (!fs.existsSync(webhookPath)) {
  failures.push("Webhook de assinatura ausente.");
} else {
  const webhook = fs.readFileSync(webhookPath, "utf8");
  if (!/\.rpc\(\s*["']complete_signature_business_state["']/m.test(webhook)) {
    failures.push(
      "VACINA-033: webhook precisa chamar complete_signature_business_state."
    );
  }
  if (/void\s+admin\./m.test(webhook)) {
    failures.push(
      "VACINA-033: webhook não pode descartar silenciosamente Promises de atualização do domínio."
    );
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        migrationCount: migrationFiles.length,
        vaccines: ["VACINA-033", "VACINA-034", "VACINA-035", "VACINA-036"],
        failures
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      migrationCount: migrationFiles.length,
      vaccines: ["VACINA-033", "VACINA-034", "VACINA-035", "VACINA-036"],
      checks: {
        independentProcurementApproval: true,
        typedEnumTransitions: true,
        canonicalReceiptLineOrder: true,
        sharedSignatureCompletion: true,
        webhookAwaitsDomainUpdates: true
      }
    },
    null,
    2
  )
);
