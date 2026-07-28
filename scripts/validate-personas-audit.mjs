import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo obrigatório ausente: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const auditPath = "diretrizes/CONTRATO-AUDITAVEL-DE-PERSONAS.md";
const personasPath = "diretrizes/PERSONAS-E-ROTINAS.md";
const readFirstPath = "diretrizes/LEIA-PRIMEIRO.md";
const catalogPath = "lib/personas/catalog.ts";

const audit = read(auditPath);
const personas = read(personasPath);
const readFirst = read(readFirstPath);
const catalog = read(catalogPath);

const operationalPersonas = Array.from({ length: 16 }, (_, index) => `P${index + 1}`);
const pendingControlRoles = Array.from({ length: 6 }, (_, index) => `P${index + 17}`);
const allowedResults = [
  "PASS",
  "FAIL",
  "PARTIAL",
  "NOT_ASSESSED",
  "BLOCKED_EXTERNAL",
  "NOT_APPLICABLE"
];

assert(
  readFirst.includes("CONTRATO-AUDITAVEL-DE-PERSONAS.md"),
  "LEIA-PRIMEIRO.md precisa apontar para o contrato auditável de personas."
);

for (const result of allowedResults) {
  assert(
    audit.includes(`\`${result}\``) || audit.includes(` ${result} `),
    `Resultado auditável obrigatório ausente: ${result}`
  );
}

const requiredCommonSections = [
  "# 1. Resultado permitido ao auditor e ao LLM",
  "# 2. Contrato obrigatório de toda persona",
  "# 3. Segregações universais",
  "# 4. Contratos por persona",
  "# 5. Papéis organizacionais ainda ausentes",
  "# 6. Como o LLM audita um componente",
  "# 7. Testes mínimos por componente",
  "# 8. Critérios para considerar uma persona completa"
];

for (const heading of requiredCommonSections) {
  assert(audit.includes(heading), `Seção canônica ausente: ${heading}`);
}

const requiredContractTerms = [
  "Autoridade",
  "proibições",
  "Evidência mínima",
  "gatilho",
  "entrada mínima",
  "saída obrigatória",
  "critério de aprovação",
  "teste negativo",
  "segregação de função"
];

for (const term of requiredContractTerms) {
  assert(
    audit.toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR")),
    `Conceito obrigatório ausente no contrato auditável: ${term}`
  );
}

for (const id of operationalPersonas) {
  const auditHeading = new RegExp(`^## ${id}\\s+—`, "m");
  // P1–P7 são capítulos; P8–P16 ficam dentro do capítulo agrupador e usam ##.
  // O validador verifica a presença da persona sem reformatar o documento canônico.
  const personasHeading = new RegExp(`^#{1,2} ${id}\\s+—`, "m");
  const catalogId = new RegExp(`id:\\s*["']${id}["']`);

  assert(auditHeading.test(audit), `${id} não possui contrato auditável.`);
  assert(personasHeading.test(personas), `${id} não está descrita em PERSONAS-E-ROTINAS.md.`);
  assert(catalogId.test(catalog), `${id} não está materializada no catálogo executável.`);
}

for (const id of pendingControlRoles) {
  const pendingHeading = new RegExp(`^## ${id}\\s+—`, "m");
  assert(pendingHeading.test(audit), `${id} precisa permanecer declarada como lacuna organizacional.`);
}

const forbiddenInferenceRules = [
  "código lido em runtime aprovado",
  "botão existente em processo executado",
  "teste não executado em sucesso",
  "declaração da própria pessoa em competência demonstrada"
];

for (const rule of forbiddenInferenceRules) {
  assert(audit.includes(rule), `Regra contra inferência indevida ausente: ${rule}`);
}

const segregationPairs = [
  "criar ≠ aprovar",
  "solicitar ≠ comprar",
  "comprar ≠ receber",
  "lançar ≠ aprovar ≠ liquidar",
  "administrar acesso ≠ auditar o próprio controle"
];

for (const pair of segregationPairs) {
  assert(audit.includes(pair), `Segregação universal ausente: ${pair}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      auditDocument: auditPath,
      operationalPersonas: operationalPersonas.length,
      pendingControlRoles: pendingControlRoles.length,
      allowedResults,
      checks: {
        canonicalLink: true,
        personaCoverage: true,
        catalogCoverage: true,
        segregationRules: true,
        llmInferenceGuards: true
      }
    },
    null,
    2
  )
);