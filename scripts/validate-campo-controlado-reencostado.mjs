// Campo controlado que atravessa server action é reencostado no DOM —
// VACINA-051.
//
// ## Por que existe
//
// Na tela de emissão de documento o fluxo é: escolher cliente e obra → **Gerar
// prévia** → conferir → **Emitir**. Os dois botões enviam o mesmo formulário, e
// a promessa da tela é que o que se vê na prévia é o que vai ser gravado.
//
// Não era:
//
//     prévia    7 lacunas
//     emitido  11 lacunas
//
// Entre um clique e o outro o cliente e a obra sumiram do envio. O documento
// gravado — imutável, porque documento emitido não se corrige — saiu sem o
// cliente que a pessoa tinha escolhido.
//
// A causa não é perda de estado. O estado continuou intacto o tempo todo; o que
// se perdeu foi o **DOM**, e é o DOM que o formulário envia. A resposta da
// server action re-renderiza a árvore do servidor, o navegador larga a seleção
// do `<select>`, e o React não a repõe porque, do ponto de vista dele, nada
// mudou.
//
// A vacina declarava prevenção por `verif26.mjs`, arquivo de um arnês que nunca
// foi versionado aqui. Medido em 11/08/2026: não havia portão nenhum.
//
// ## A regra que este portão cobra
//
// Num componente que usa `useActionState`, campo **controlado** — `value={…}`
// ligado a estado — e **enviado** — com `name` — tem de passar por
// `useReencostarNoDom`.
//
// ## O que fica de fora, e por quê
//
// Campo com `defaultValue` **não** é cobrado: ele é não controlado, o DOM é a
// verdade dele, e não há do que divergir. É a situação de 16 dos 17 campos de
// seleção do repositório — motivo pelo qual este portão nasce verde e continua
// legítimo: ele não é para o que existe, é para o próximo `value={estado}`.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const PASTAS = ["app", "components"];
const GANCHO = "useReencostarNoDom";

function varrer(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) varrer(p, acc);
    else if (entrada.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const problemas = [];
let componentes = 0, controlados = 0, naoControlados = 0;

for (const pasta of PASTAS) {
  for (const arquivo of varrer(path.join(raiz, pasta))) {
    const texto = fs.readFileSync(arquivo, "utf8");
    if (!texto.includes("useActionState")) continue;
    componentes += 1;
    const relativo = path.relative(raiz, arquivo);
    // Não basta o arquivo **mencionar** o gancho: a conferência é por campo.
    // A primeira sabotagem deste portão passou porque ele perguntava se o
    // arquivo citava `useReencostarNoDom` — e um arquivo pode ancorar três
    // campos e esquecer o quarto, que é o caso mais provável de todos.
    const fabrica = new RegExp(`const\\s+(\\w+)\\s*=\\s*${GANCHO}\\(`).exec(texto)?.[1];

    for (const achado of texto.matchAll(/<(select|input|textarea)\b([^>]*)>/gi)) {
      const atributos = achado[2];
      if (!/\bname\s*=\s*"/.test(atributos)) continue;
      // `value="literal"` é constante — não vem de estado e não diverge.
      const controlado = /\bvalue\s*=\s*\{/.test(atributos);
      if (!controlado) { naoControlados += 1; continue; }
      // `<input type="hidden" value={…}>` é reescrito pelo React a cada
      // renderização junto do resto e não é tocado pelo navegador; a perda da
      // VACINA-051 é do controle que o usuário manipula.
      if (/\btype\s*=\s*"hidden"/.test(atributos)) { naoControlados += 1; continue; }
      // Em caixa de marcar e botão de opção, `value` é **a carga enviada**, não
      // o estado do controle — quem é controlado ali é `checked`. Cobrar `value`
      // deles acusa o correto: a primeira execução deste portão apontou um
      // `type="checkbox"` e um `type="radio"` cujo `value` é a chave da linha,
      // constante por construção.
      if (/\btype\s*=\s*"(?:checkbox|radio)"/.test(atributos)) { naoControlados += 1; continue; }
      controlados += 1;
      const nome = /\bname\s*=\s*"([^"]+)"/.exec(atributos)?.[1] ?? "?";
      if (fabrica && new RegExp(`ref=\\{\\s*${fabrica}\\(`).test(atributos)) continue;

      problemas.push({
        arquivo: relativo,
        linha: texto.slice(0, achado.index).split("\n").length,
        campo: `<${achado[1].toLowerCase()} name="${nome}">`,
        motivo: fabrica ? `sem \`ref={${fabrica}("${nome}")}\`` : "a tela não usa o gancho"
      });
    }
  }
}

if (problemas.length) {
  console.error("Campo controlado que atravessa server action sem reencostar no DOM (VACINA-051):\n");
  for (const p of problemas) console.error(`  ${p.arquivo}:${p.linha} — ${p.campo} ${p.motivo}`);
  console.error(
    "\nA resposta da server action re-renderiza a árvore do servidor e o navegador larga o valor do\n" +
      "campo. O React não repõe, porque para ele nada mudou — o estado continua o mesmo. Estado e DOM\n" +
      "divergem, e **é o DOM que o formulário envia**: não há erro, não há aviso, e o que sai é o que\n" +
      "estava na tela naquele instante. Use `useReencostarNoDom` de `@/lib/forms/reencostar-no-dom`,\n" +
      "ou troque `value={…}` por `defaultValue={…}` se o campo não precisa ser controlado."
  );
  process.exit(1);
}

console.log(
  `Campos de formulário conferidos: ${componentes} componente(s) com \`useActionState\`, ` +
    `${controlados} campo(s) controlado(s) e enviado(s) — todos reencostados no DOM — e ` +
    `${naoControlados} não controlado(s), que não divergem porque o DOM é a verdade deles.`
);
