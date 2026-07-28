import fs from "node:fs";

// Verifica as regras estruturais do inventário de execução.
// As regras vivem em diretrizes/INVENTARIO-DE-EXECUCAO.md, seção "Regras de operação".

const file = "diretrizes/INVENTARIO-DE-EXECUCAO.md";
const errors = [];
const validStates = new Set(["pendente", "em andamento", "concluída", "bloqueada"]);

if (!fs.existsSync(file)) {
  console.error(`Inventário de execução ausente: ${file}`);
  process.exit(1);
}

// Normalização de quebra de linha: diretrizes/vacinas/VACINA-017-VALIDADOR-PORTAVEL-CRLF.md.
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
const sprints = [];
let current = null;

for (const line of lines) {
  const heading = line.match(/^## Sprint (S-\d+)\s+—\s+(.+)$/);
  if (heading) {
    current = { id: heading[1], name: heading[2].trim(), state: null, open: 0, done: 0 };
    sprints.push(current);
    continue;
  }
  // Só cabeçalho de nível 1 ou 2 encerra a sprint: `# Marco`, `## Sprint`,
  // `## Registro de reordenação`. Subseção `###` dentro de uma sprint é
  // conteúdo legítimo — evidência, pesquisa, tabela de defeitos — e não pode
  // fazer o validador perder as tarefas que vêm depois dela.
  if (/^#{1,2}\s/.test(line)) { current = null; continue; }
  if (!current) continue;

  const state = line.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/);
  if (state) { current.state = state[1]; continue; }

  if (/^\s*-\s\[\s\]\s/.test(line)) current.open += 1;
  else if (/^\s*-\s\[x\]\s/i.test(line)) current.done += 1;
}

if (sprints.length === 0) errors.push("Nenhuma sprint encontrada. O inventário precisa de ao menos uma.");

const seen = new Set();
for (const sprint of sprints) {
  if (seen.has(sprint.id)) errors.push(`Identificador de sprint duplicado: ${sprint.id}`);
  seen.add(sprint.id);

  if (!sprint.state) errors.push(`${sprint.id} não declara **Estado:**`);
  else if (!validStates.has(sprint.state))
    errors.push(`${sprint.id} tem estado inválido: "${sprint.state}". Válidos: ${[...validStates].join(", ")}`);

  if (sprint.open + sprint.done === 0) errors.push(`${sprint.id} não tem nenhuma tarefa. Regra R7.`);

  // R7 — sprint concluída não tem tarefa em aberto.
  if (sprint.state === "concluída" && sprint.open > 0)
    errors.push(`${sprint.id} está "concluída" com ${sprint.open} tarefa(s) em aberto. Regra R7: ou não está concluída, ou a tarefa vira sprint nova no fim (R4).`);
}

// R3 — no máximo uma sprint em andamento.
const running = sprints.filter(sprint => sprint.state === "em andamento");
if (running.length > 1)
  errors.push(`Regra R3 violada: ${running.length} sprints "em andamento" (${running.map(sprint => sprint.id).join(", ")}). Só uma por vez.`);

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\nInventário de execução reprovado: ${errors.length} problema(s).`);
  process.exit(1);
}

const totals = sprints.reduce((acc, sprint) => ({ open: acc.open + sprint.open, done: acc.done + sprint.done }), { open: 0, done: 0 });
const byState = [...validStates].map(state => `${sprints.filter(sprint => sprint.state === state).length} ${state}`).join(", ");
console.log(`Inventário de execução validado: ${sprints.length} sprints (${byState}); ${totals.done} tarefas concluídas e ${totals.open} em aberto.`);
