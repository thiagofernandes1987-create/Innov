import fs from "node:fs";

// Invariantes do pipeline. Contrato em diretrizes/PADRAO-DE-INTERFACE.md.
//
// O ponto central: as siglas de data existem em dois lugares — a função
// imutável do banco e o módulo TypeScript que a interface usa. Divergir é
// como a tela passa a exibir um campo que nenhum filtro alcança, ou a gravar
// uma combinação que o CHECK recusa. A coerência é verificada aqui, não
// confiada à disciplina de quem editar um dos dois arquivos.

const errors = [];

const SCHEMA = "supabase/migrations/20260726120000_pipeline_trilhas.sql";
const PRESETS = "supabase/migrations/20260726123000_pipeline_presets.sql";
const MODULE = "lib/pipeline/datas.ts";

const TABLES = [
  "pipelines",
  "pipeline_stages",
  "pipeline_stage_date_codes",
  "pipeline_cards",
  "pipeline_card_dates",
  "pipeline_tags",
  "pipeline_card_tags",
  "pipeline_card_notes",
  "pipeline_card_stage_history"
];

function read(file) {
  if (!fs.existsSync(file)) {
    errors.push(`Arquivo obrigatório do pipeline ausente: ${file}`);
    return null;
  }
  return fs.readFileSync(file, "utf8");
}

const schema = read(SCHEMA);
const presets = read(PRESETS);
const moduloTs = read(MODULE);

if (schema && presets && moduloTs) {
  // 1. Toda tabela com RLS habilitada, forçada e com política.
  for (const table of TABLES) {
    if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(schema))
      errors.push(`${table} não habilita RLS.`);
    if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i").test(schema))
      errors.push(`${table} não força RLS — o dono da tabela escaparia da política.`);
    if (!new RegExp(`create\\s+policy\\s+\\w+\\s+on\\s+public\\.${table}`, "i").test(schema))
      errors.push(`${table} não tem política nenhuma.`);
    if (!new RegExp(`revoke\\s+all\\s+on\\s+public\\.${table}\\s+from\\s+anon,\\s*authenticated`, "i").test(schema))
      errors.push(`${table} não revoga privilégio de anon e authenticated antes de conceder (VACINA-004).`);
  }

  // 2. Permissão vem do motor que já existe.
  if (!/has_module_permission\s*\(/i.test(schema))
    errors.push("As políticas do pipeline não chamam has_module_permission.");

  // 3. Histórico de etapa não é escrito pela aplicação.
  if (/grant\s+[^;]*\b(insert|update|delete)\b[^;]*on\s+public\.pipeline_card_stage_history/i.test(schema))
    errors.push("pipeline_card_stage_history concede escrita a papel de cliente — o histórico é do gatilho.");

  // 4. Funções privilegiadas com search_path fixo (VACINA-004).
  for (const source of [schema, presets]) {
    const definers = [...source.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)[\s\S]*?\$\$/gi)];
    for (const match of definers) {
      if (/security\s+definer/i.test(match[0]) && !/set\s+search_path\s*=/i.test(match[0]))
        errors.push(`Função ${match[1]} é security definer e não fixa search_path.`);
    }
  }

  // 5. As siglas: SQL e TypeScript precisam declarar exatamente as mesmas.
  const sqlCodes = new Map();
  for (const match of schema.matchAll(/when\s+'(\w+):(\w+)'\s+then\s+'([A-Z]{3})'/g)) {
    sqlCodes.set(match[3], `${match[1]}:${match[2]}`);
  }

  const tsCodes = new Map();
  for (const match of moduloTs.matchAll(/(\b[A-Z]{3}\b):\s*\{\s*natureza:\s*"(\w+)",\s*marco:\s*"(\w+)"\s*\}/g)) {
    tsCodes.set(match[1], `${match[2]}:${match[3]}`);
  }

  if (sqlCodes.size === 0) errors.push("Não foi possível extrair sigla nenhuma de pipeline_codigo_data.");
  if (tsCodes.size === 0) errors.push(`Não foi possível extrair sigla nenhuma de ${MODULE}.`);

  for (const [codigo, eixos] of sqlCodes) {
    if (!tsCodes.has(codigo)) {
      errors.push(`Sigla ${codigo} existe no banco e não em ${MODULE}.`);
    } else if (tsCodes.get(codigo) !== eixos) {
      errors.push(
        `Sigla ${codigo} diverge: banco diz ${eixos}, ${MODULE} diz ${tsCodes.get(codigo)}.`
      );
    }
  }
  for (const codigo of tsCodes.keys()) {
    if (!sqlCodes.has(codigo)) errors.push(`Sigla ${codigo} existe em ${MODULE} e não no banco.`);
  }

  // 6. Toda combinação usada pelos presets tem sigla no catálogo do banco.
  const usadas = new Set();
  for (const match of presets.matchAll(/'(limite|prevista|efetiva):(inicio|termino|entrega|agendamento|assistencia)'/g)) {
    usadas.add(`${match[1]}:${match[2]}`);
  }
  const declaradas = new Set(sqlCodes.values());
  for (const combinacao of usadas) {
    if (!declaradas.has(combinacao))
      errors.push(`Preset usa a combinação ${combinacao}, que não tem sigla declarada.`);
  }

  // 7. Etapa é dado, não esquema. Nome de etapa de segmento dentro de um CHECK
  //    é o que obrigaria a uma migration só para renomear uma coluna do kanban.
  const jargao = /\b(medicao|fabricacao|montagem|marcenaria|planejados)\b/i;
  for (const linha of schema.split("\n")) {
    if (/\bcheck\s*\(/i.test(linha) && jargao.test(linha))
      errors.push(`Jargão de segmento dentro de CHECK no esquema: ${linha.trim()}`);
  }

  // 8. As duas listas declaradas pelo responsável, com nove etapas cada.
  for (const preset of ["projeto_moveis_planejados", "assistencia_padrao"]) {
    // A linha de etapa é a que declara categoria; a do catálogo de presets
    // repete a mesma chave e não deve ser contada.
    const linhas = presets
      .split("\n")
      .filter(linha => linha.includes(`('${preset}', '`) && /'(aberto|ganho|perdido)'/.test(linha));
    if (linhas.length !== 9)
      errors.push(`Preset ${preset} tem ${linhas.length} etapa(s) declarada(s), esperado 9.`);
  }
}

if (errors.length > 0) {
  console.error("Validação do pipeline reprovada:\n");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Validação do pipeline aprovada.");
