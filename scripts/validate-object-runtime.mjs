import fs from "node:fs";

// Invariantes do Object Runtime. Contrato em diretrizes/OBJECT-RUNTIME.md.
//
// O ponto central: a projeção de slots é derivada do spec pelo banco, e o
// orçamento e o mapa de tipos existem em dois lugares — SQL e TypeScript.
// Divergir é como a projeção deixa de corresponder à definição, então a
// coerência entre os dois é verificada aqui, não confiada à disciplina.

const errors = [];

const CATALOG = "supabase/migrations/20260726090000_object_runtime_definition_catalog.sql";
const PUBLICATION = "supabase/migrations/20260726093000_object_runtime_publication.sql";
const SPEC_MODULE = "lib/object-runtime/spec.ts";
const TABLES = ["object_definitions", "object_definition_versions", "object_field_slots"];

function read(file) {
  if (!fs.existsSync(file)) {
    errors.push(`Arquivo obrigatório do Object Runtime ausente: ${file}`);
    return null;
  }
  return fs.readFileSync(file, "utf8");
}

const catalog = read(CATALOG);
const publication = read(PUBLICATION);
const specModule = read(SPEC_MODULE);

if (catalog && publication && specModule) {
  // 1. Toda tabela do catálogo com RLS habilitada e forçada.
  for (const table of TABLES) {
    if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(catalog))
      errors.push(`${table} não habilita RLS.`);
    if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i").test(catalog))
      errors.push(`${table} não força RLS — o dono da tabela escaparia da política.`);
    if (!new RegExp(`create\\s+policy\\s+\\w+\\s+on\\s+public\\.${table}`, "i").test(catalog))
      errors.push(`${table} não tem política de leitura.`);
  }

  // 2. A permissão vem do motor que já existe, não de mecanismo paralelo.
  if (!/has_module_permission\s*\(/i.test(catalog))
    errors.push("As políticas do catálogo não chamam has_module_permission.");

  // 3. Escrita direta revogada: o único caminho de escrita é a RPC.
  for (const table of TABLES) {
    if (!new RegExp(`revoke\\s+all\\s+on\\s+public\\.${table}\\s+from\\s+anon,\\s*authenticated`, "i").test(catalog))
      errors.push(`${table} não revoga escrita direta de anon e authenticated (VACINA-004).`);
    const grant = new RegExp(`grant\\s+(insert|update|delete)[^;]*on\\s+public\\.${table}[^;]*to[^;]*(anon|authenticated)`, "i");
    if (grant.test(catalog)) errors.push(`${table} concede escrita direta a papel de cliente.`);
  }

  // 4. Versão publicada é imutável por guarda no banco, não por convenção.
  if (!/create\s+trigger\s+object_definition_versions_no_update[\s\S]*?before\s+update\s+or\s+delete/i.test(catalog))
    errors.push("Falta a guarda de imutabilidade da versão publicada.");

  // 5. Funções privilegiadas com search_path fixo (VACINA-004).
  const definers = [...publication.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(([\s\S]*?)\$\$/gi)];
  for (const [body, name] of definers.map(match => [match[0], match[1]])) {
    if (!/set\s+search_path\s*=/i.test(body)) errors.push(`Função ${name} não fixa search_path.`);
  }
  if (!/create\s+or\s+replace\s+function\s+public\.publish_object_definition[\s\S]*?security\s+definer/i.test(publication))
    errors.push("publish_object_definition não é security definer.");
  if (!/revoke\s+all\s+on\s+function\s+public\.publish_object_definition\([^)]*\)\s+from\s+public,\s*anon/i.test(publication))
    errors.push("publish_object_definition não revoga execução de public e anon.");
  if (!/grant\s+execute\s+on\s+function\s+public\.publish_object_definition\([^)]*\)\s+to\s+authenticated/i.test(publication))
    errors.push("publish_object_definition não concede execução a authenticated.");

  // 6. A projeção é derivada, nunca recebida pronta.
  if (/publish_object_definition[\s\S]*?p_slots|p_field_slots/i.test(publication))
    errors.push("A RPC de publicação aceita a projeção de slots como parâmetro. Ela precisa ser derivada do spec.");
  if (!/insert\s+into\s+public\.object_field_slots[\s\S]*?public\.object_runtime_allocate_slots/i.test(publication))
    errors.push("A projeção de slots não é derivada por object_runtime_allocate_slots.");

  // 7. Orçamento de slots coerente entre SQL e TypeScript.
  const sqlBudget = {};
  const budgetBlock = publication.match(/function\s+public\.object_runtime_slot_budget[\s\S]*?\$\$([\s\S]*?)\$\$/i);
  if (!budgetBlock) errors.push("Função object_runtime_slot_budget não encontrada.");
  else for (const match of budgetBlock[1].matchAll(/when\s+'(\w+)'\s+then\s+(\d+)/gi)) sqlBudget[match[1]] = Number(match[2]);

  const tsBudget = {};
  const tsBudgetBlock = specModule.match(/SLOT_BUDGET[^=]*=\s*\{([\s\S]*?)\}/);
  if (!tsBudgetBlock) errors.push("Constante SLOT_BUDGET não encontrada em lib/object-runtime/spec.ts.");
  else for (const match of tsBudgetBlock[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) tsBudget[match[1]] = Number(match[2]);

  const families = new Set([...Object.keys(sqlBudget), ...Object.keys(tsBudget)]);
  for (const family of families) {
    if (sqlBudget[family] !== tsBudget[family])
      errors.push(`Orçamento de slots divergente na família "${family}": SQL=${sqlBudget[family]}, TypeScript=${tsBudget[family]}.`);
  }

  // 8. Mapa tipo → família coerente entre SQL e TypeScript.
  const sqlFamily = {};
  const familyBlock = publication.match(/function\s+public\.object_runtime_slot_family[\s\S]*?\$\$([\s\S]*?)\$\$/i);
  if (!familyBlock) errors.push("Função object_runtime_slot_family não encontrada.");
  else for (const match of familyBlock[1].matchAll(/when\s+'(\w+)'\s+then\s+'(\w+)'/gi)) sqlFamily[match[1]] = match[2];

  const tsFamily = {};
  const tsFamilyBlock = specModule.match(/SLOT_FAMILY_BY_TYPE[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!tsFamilyBlock) errors.push("Mapa SLOT_FAMILY_BY_TYPE não encontrado em lib/object-runtime/spec.ts.");
  else for (const match of tsFamilyBlock[1].matchAll(/(\w+)\s*:\s*"(\w+)"/g)) tsFamily[match[1]] = match[2];

  for (const type of new Set([...Object.keys(sqlFamily), ...Object.keys(tsFamily)])) {
    if (sqlFamily[type] !== tsFamily[type])
      errors.push(`Família do tipo "${type}" divergente: SQL=${sqlFamily[type] ?? "(ausente)"}, TypeScript=${tsFamily[type] ?? "(ausente)"}.`);
  }

  // 9. O formato gravado precisa ser o formato que a alocação produz.
  const constraint = catalog.match(/slot_column\s+text\s+not\s+null\s+check\s*\(\s*slot_column\s*~\s*'([^']+)'/i);
  if (!constraint) errors.push("object_field_slots não restringe o formato de slot_column.");
  else {
    const pattern = new RegExp(constraint[1]);
    for (const [family, budget] of Object.entries(tsBudget)) {
      for (let index = 1; index <= budget; index += 1) {
        if (!pattern.test(`${family}_${index}`))
          errors.push(`O check de slot_column recusa "${family}_${index}", que a alocação produz.`);
      }
    }
  }

  // 10. A migration precisa provar alguma coisa ao ser aplicada.
  for (const [file, content] of [[CATALOG, catalog], [PUBLICATION, publication]]) {
    if (!/do\s*\$\$[\s\S]*?raise\s+exception/i.test(content))
      errors.push(`${file} não tem bloco de autoverificação que falhe quando a invariante quebra.`);
  }

  // 11. Sem jargão de segmento no núcleo do runtime (regra da sprint S-20).
  const jargon = /\b(obra|obras|canteiro|empreiteir|fvs|fvm)\b/i;
  if (jargon.test(specModule)) errors.push("lib/object-runtime/spec.ts contém termo de segmento. O núcleo do runtime é neutro.");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\nObject Runtime reprovado: ${errors.length} problema(s).`);
  process.exit(1);
}

console.log("Object Runtime validado: catálogo com RLS forçada, escrita somente por RPC, versão imutável, projeção derivada e orçamento de slots coerente entre SQL e TypeScript.");
