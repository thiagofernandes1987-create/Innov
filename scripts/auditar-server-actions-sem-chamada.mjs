// Detecta server actions exportadas que não possuem consumidor no runtime web.
//
// Diferente de `validate-server-actions.mjs`, que valida o formato de módulos
// "use server", este arquivo trabalha por símbolo. Isso encontra o caso em que
// um arquivo tem dez actions usadas e uma décima-primeira antiga que ninguém
// mais importa — o arquivo é alcançável, mas a função não é.
//
// Saída é auditoria, não gate automático: actions podem ser chamadas
// internamente por outra action do mesmo arquivo ou por integração fora do app.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const json = process.argv.includes("--json");
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function listar(dir, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) listar(abs, saida);
    else if (EXT.some(ext => ent.name.endsWith(ext))) saida.push(abs);
  }
  return saida;
}

const rel = arq => path.relative(raiz, arq).split(path.sep).join("/");
const runtimeFiles = ["app", "components", "lib"].flatMap(dir => listar(path.join(raiz, dir)));
const sources = new Map(runtimeFiles.map(arq => [rel(arq), fs.readFileSync(arq, "utf8")]));

function isServerModule(source) {
  const primeira = source
    .split("\n")
    .map(l => l.trim())
    .find(l => l && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));
  return primeira === '"use server";' || primeira === "'use server';";
}

const actions = [];
for (const [file, source] of sources) {
  if (!isServerModule(source)) continue;
  for (const m of source.matchAll(/export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    actions.push({ file, name: m[1] });
  }
}

function importPathToCandidates(spec, importer) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), spec));
  else return [];
  const semExt = EXT.reduce((v, ext) => v.endsWith(ext) ? v.slice(0, -ext.length) : v, base);
  return EXT.map(ext => `${semExt}${ext}`);
}

const consumers = new Map(actions.map(a => [`${a.file}#${a.name}`, new Set()]));

for (const [importer, source] of sources) {
  // Imports nomeados. Cobre aliases e multiline.
  for (const m of source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*["'`]([^"'`]+)["'`]/g)) {
    const candidates = importPathToCandidates(m[2], importer);
    const target = candidates.find(c => sources.has(c));
    if (!target) continue;
    const names = m[1].split(",").map(x => x.trim()).filter(Boolean);
    for (const raw of names) {
      if (raw.startsWith("type ")) continue;
      const original = raw.split(/\s+as\s+/)[0].trim();
      const key = `${target}#${original}`;
      if (consumers.has(key)) consumers.get(key).add(importer);
    }
  }
}

// Referências internas no próprio módulo. Remove a assinatura de definição antes
// de procurar o nome, para que a exportação não conte como seu próprio uso.
for (const action of actions) {
  const source = sources.get(action.file) ?? "";
  const semDef = source.replace(
    new RegExp(`export\\s+async\\s+function\\s+${action.name}\\s*\\(`),
    "export async function __DEFINITION__("
  );
  if (new RegExp(`\\b${action.name}\\s*\\(`).test(semDef)) {
    consumers.get(`${action.file}#${action.name}`).add(`${action.file} (interno)`);
  }
}

const unused = actions
  .filter(a => (consumers.get(`${a.file}#${a.name}`)?.size ?? 0) === 0)
  .sort((a, b) => `${a.file}#${a.name}`.localeCompare(`${b.file}#${b.name}`, "pt-BR"));

const report = {
  schemaVersion: 1,
  serverActions: actions.length,
  unusedCount: unused.length,
  warning: "Sem import no runtime web é candidato de auditoria; confirme chamadas externas e SQL antes de remover.",
  unused,
  consumers: Object.fromEntries(
    [...consumers.entries()]
      .filter(([, set]) => set.size)
      .map(([key, set]) => [key, [...set].sort()])
  )
};

if (json) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(`Server actions exportadas: ${report.serverActions}`);
  console.log(`Sem consumidor encontrado: ${report.unusedCount}`);
  for (const item of unused) console.log(`- ${item.file}#${item.name}`);
  console.log("\nCandidato sem chamada não é autorização automática para excluir.");
}
