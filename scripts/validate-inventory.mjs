import fs from "node:fs";
import { execSync } from "node:child_process";

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

/**
 * Marcos declarados no registro do topo, com o estado de cada um.
 *
 * O Marco é a unidade de conclusão — "finalizar o módulo X" — e a sprint é o
 * conjunto de tarefas para chegar lá. Ele é **rótulo**, não seção: achado novo
 * vai fisicamente para o fim do arquivo (R4, para não interromper a sprint em
 * curso) e declara a que Marco pertence. É o rótulo que devolve a coerência.
 */
const marcos = new Map();
for (const line of lines) {
  const linha = line.match(/^\|\s*`(M-[A-Z0-9-]+)`\s*\|([^|]*)\|\s*(.+?)\s*\|\s*$/);
  if (linha) marcos.set(linha[1], { objetivo: linha[2].trim(), estado: linha[3].replace(/\*\*/g, "").trim() });
}

for (const line of lines) {
  const heading = line.match(/^## Sprint (S-\d+)\s+—\s+(.+)$/);
  if (heading) {
    current = { id: heading[1], name: heading[2].trim(), state: null, marco: null, open: 0, done: 0, abertas: [] };
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

  const marco = line.match(/^\*\*Marco:\*\*\s*(\S+)\s*$/);
  if (marco) { current.marco = marco[1]; continue; }

  if (/^\s*-\s\[\s\]\s/.test(line)) {
    current.open += 1;
    current.abertas.push(line);
  } else if (/^\s*-\s\[x\]\s/i.test(line)) current.done += 1;
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

// R4 — toda sprint declara o Marco a que pertence, e o Marco existe no registro.
for (const sprint of sprints) {
  if (!sprint.marco) {
    errors.push(`${sprint.id} não declara **Marco:**. Regra R4: o novo vai para o fim do arquivo, mas declara a que Marco pertence.`);
  } else if (marcos.size > 0 && !marcos.has(sprint.marco)) {
    errors.push(`${sprint.id} declara o Marco "${sprint.marco}", que não existe no "Registro de Marcos".`);
  }
}

// Sprint entregue e não fechada.
//
// Sprint com todas as tarefas marcadas e estado diferente de `concluída` é
// trabalho pronto que continua ocupando a fila, e — pela R9 — segura o Marco
// dela aberto sem motivo. A S-32 passou assim: **46 tarefas feitas, zero
// abertas, estado `pendente`**, e só foi vista na varredura da S-75.
for (const sprint of sprints) {
  if (sprint.state !== "concluída" && sprint.open === 0 && sprint.done > 0) {
    errors.push(
      `${sprint.id} tem ${sprint.done} tarefa(s) feita(s) e nenhuma aberta, mas está "${sprint.state}". ` +
        `Sprint entregue e não fechada segura o Marco dela aberto (R9). Marque \`concluída\` ou reabra o que falta.`
    );
  }
}

/**
 * Tarefa aberta que cita arquivo inexistente.
 *
 * A premissa dela caiu: o arquivo foi removido ou renomeado, e ninguém voltou
 * à tarefa. Quem for executá-la vai procurar o que não existe.
 *
 * **Tarefa fechada é isenta, e a isenção é deliberada.** Ela é registro do que
 * foi feito naquele dia; corrigir o caminho depois falsificaria o histórico —
 * é a mesma regra da VACINA-067 sobre medição datada. Havia 7 assim na
 * varredura de 11/08/2026, todas legítimas.
 */
const versionados = new Set();
try {
  for (const arquivo of execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)) {
    versionados.add(arquivo);
    versionados.add(arquivo.split("/").pop());
  }
} catch {
  // Sem git — o portão não inventa reprovação sobre o que não conseguiu medir.
}
if (versionados.size > 0) {
  for (const sprint of sprints) {
    for (const tarefa of sprint.abertas) {
      for (const citado of tarefa.matchAll(/`([A-Za-z0-9_.\/-]+\.(?:ts|tsx|mjs|sql|json|md|svg|png|go|py))`/g)) {
        const alvo = citado[1];
        if (versionados.has(alvo)) continue;
        if (!alvo.includes("/") && versionados.has(alvo)) continue;
        if (fs.existsSync(alvo)) continue;
        errors.push(
          `${sprint.id} tem tarefa aberta citando \`${alvo}\`, que não existe. A premissa da tarefa caiu: ` +
            `o arquivo foi removido ou renomeado. Corrija a tarefa — tarefa fechada é isenta, porque é registro histórico.`
        );
      }
    }
  }
}

// R9 — Marco só fecha quando nenhuma sprint aberta o referencia.
const abertasPorMarco = new Map();
const totalPorMarco = new Map();
for (const sprint of sprints) {
  if (!sprint.marco) continue;
  totalPorMarco.set(sprint.marco, (totalPorMarco.get(sprint.marco) ?? 0) + 1);
  if (sprint.state !== "concluída") {
    if (!abertasPorMarco.has(sprint.marco)) abertasPorMarco.set(sprint.marco, []);
    abertasPorMarco.get(sprint.marco).push(sprint.id);
  }
}
for (const [id, marco] of marcos) {
  if (marco.estado !== "concluído") continue;
  const abertas = abertasPorMarco.get(id) ?? [];
  if (abertas.length > 0)
    errors.push(
      `Regra R9 violada: o Marco ${id} está "concluído" e ainda tem ${abertas.length} sprint(s) aberta(s) (${abertas.join(", ")}). ` +
        `Achado novo entra no fim do arquivo, mas o Marco não fecha por cima dele.`
    );
  if ((totalPorMarco.get(id) ?? 0) === 0)
    errors.push(`Regra R9 violada: o Marco ${id} está "concluído" sem nenhuma sprint. Marco sem sprint está "sem sprint", não concluído.`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\nInventário de execução reprovado: ${errors.length} problema(s).`);
  process.exit(1);
}

const totals = sprints.reduce((acc, sprint) => ({ open: acc.open + sprint.open, done: acc.done + sprint.done }), { open: 0, done: 0 });
const byState = [...validStates].map(state => `${sprints.filter(sprint => sprint.state === state).length} ${state}`).join(", ");
console.log(`Inventário de execução validado: ${sprints.length} sprints (${byState}); ${totals.done} tarefas concluídas e ${totals.open} em aberto.`);

// R9, lado informativo: qual Marco pode ser fechado na próxima virada.
// Fechar é decisão de quem conduz, não do validador — ele só avisa que dá.
const fechaveis = [...marcos.keys()].filter(
  id => marcos.get(id).estado !== "concluído" && (totalPorMarco.get(id) ?? 0) > 0 && (abertasPorMarco.get(id) ?? []).length === 0
);
console.log(
  `Marcos: ${marcos.size} declarados, ${[...marcos.values()].filter(m => m.estado === "concluído").length} concluído(s).` +
    (fechaveis.length ? ` Candidatos a fechamento na próxima virada (R9): ${fechaveis.join(", ")}.` : "")
);
