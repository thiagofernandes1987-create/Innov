// Escopo e saída de máquina para os validadores de formulário e consulta.
//
// ## Por que existe
//
// Os quatro portões da S-73 — CRLF na entrada, campo controlado reencostado,
// `Escape` uma camada por vez e coluna que existe — respondem **globalmente**:
// *"nenhum campo do repositório está solto"*. É o que o CI precisa.
//
// Não é o que decide um Marco. A pergunta que fecha um módulo é *"este módulo
// está pronto?"*, e para respondê-la é preciso saber quantos desses construtos
// o módulo tem e se estão cobertos — zero campos controlados e três campos
// controlados cobertos são respostas diferentes, e a segunda é a que prova que
// alguém olhou.
//
// Este arquivo dá aos quatro validadores duas capacidades, sem duplicar a
// detecção em lugar nenhum:
//
//   --escopo <prefixo>  restringe aos arquivos sob aquele caminho
//   --json              imprime `{ conferidos, problemas }` e **sai com 0**,
//                       porque quem chama é que decide o que fazer com o número
//
// A detecção continua sendo a mesma, no mesmo arquivo, rodada pelo mesmo
// código. Um relatório por módulo que reimplementasse a regra divergiria do
// portão em silêncio — que é o defeito que a S-73 inteira passou o dia
// corrigindo.

/** Lê os dois argumentos, sem depender de ordem. */
export function opcoes(argv = process.argv.slice(2)) {
  const i = argv.indexOf("--escopo");
  return {
    escopo: i !== -1 ? argv[i + 1] ?? null : null,
    json: argv.includes("--json")
  };
}

/**
 * Mantém só os arquivos sob os prefixos, quando há prefixo.
 *
 * Aceita lista separada por vírgula. Um módulo não vive só na pasta da rota: o
 * formulário está em `app/app/<rota>`, a server action que o recebe está em
 * `app/actions/<arquivo>.ts` e o componente pode estar em `components/`.
 * Escopo de um prefixo só responderia "nada a conferir" para um módulo cheio de
 * `<textarea>`, que é pior que não responder.
 */
export function noEscopo(caminhos, escopo, comoRelativo = c => c) {
  if (!escopo) return caminhos;
  const alvos = escopo
    .split(",")
    .map(e => e.trim().replace(/^\.\//, "").replace(/\/$/, ""))
    .filter(Boolean);
  if (!alvos.length) return caminhos;
  return caminhos.filter(c => {
    const rel = comoRelativo(c);
    return alvos.some(alvo => rel === alvo || rel.startsWith(alvo + "/"));
  });
}

/**
 * Encerra o processo do jeito que o chamador espera.
 *
 * Em `--json` o portão **não reprova**: ele informa. Quem chama — o relatório
 * de módulo — mostra o número ao lado dos outros itens, e a reprovação continua
 * sendo trabalho do CI, que roda sem escopo e sobre o repositório inteiro.
 */
export function encerrar({ json, problemas, conferidos, resumo, explicacao }) {
  if (json) {
    console.log(JSON.stringify({ conferidos, problemas }));
    process.exit(0);
  }
  if (problemas.length) {
    console.error(resumo + "\n");
    for (const p of problemas) console.error(`  ${p.onde} — ${p.o_que}`);
    if (explicacao) console.error("\n" + explicacao);
    process.exit(1);
  }
  return false;
}
