// Numeração automática da EAP.
//
// Ditado pelo responsável em 2 de agosto:
//
//   "se for na eap no Gantt o primeiro item é o 1, os subitens devem
//   automaticamente serem 1.1, 1.2, 1.xxx, o item da próxima etapa é o 2, e
//   assim por diante, se um subitem eu mudo para etapa ele vira o número da
//   etapa anterior+1 (…) se já temos na tabela salvo o sequenciamento dos
//   itens por que toda vez fazer o usuário digitar?"
//
// A crítica é exata: o formulário exigia `code` com `required` e placeholder
// "1.2". Pedir ao usuário um número que o sistema já sabe calcular é transferir
// para ele o trabalho de manter a consistência — e ele erra, porque numeração
// de EAP é justamente o que se desorganiza quando alguém insere no meio.
//
// A numeração é **posicional**: o código não é identidade, é posição na
// árvore. Mover um item renumera; o identificador estável é o `id`.

/** Item mínimo para numerar: quem é o pai e em que ordem aparece. */
export type ItemEAP = {
  id: string;
  parentId: string | null;
  sequence: number;
  code?: string;
};

/** Separa "1.2.10" em [1, 2, 10]. Trecho não numérico vira 0. */
export function partes(codigo: string): number[] {
  return String(codigo ?? "")
    .split(".")
    .map(p => {
      const n = Number.parseInt(p.replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** Ordena por código como número, não como texto: "10" vem depois de "9". */
export function compararCodigos(a: string, b: string): number {
  const x = partes(a);
  const y = partes(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Próximo código para um novo item sob `paiCodigo`.
 *
 * Sem pai, é o próximo da raiz: "1", "2", "3". Com pai "2", é "2.1", "2.2".
 * O próximo é sempre **maior que o maior existente**, nunca o primeiro buraco:
 * reaproveitar número de item excluído faz dois documentos antigos apontarem
 * para coisas diferentes com o mesmo código.
 */
export function proximoCodigo(codigosExistentes: string[], paiCodigo: string | null): string {
  const prefixo = paiCodigo ? `${paiCodigo}.` : "";
  const nivel = paiCodigo ? partes(paiCodigo).length + 1 : 1;

  let maior = 0;
  for (const codigo of codigosExistentes) {
    if (!codigo) continue;
    if (paiCodigo) {
      if (!codigo.startsWith(prefixo)) continue;
      // Só filho direto: "2.1" conta para o pai "2", "2.1.3" não.
      if (partes(codigo).length !== nivel) continue;
    } else if (partes(codigo).length !== 1) {
      continue;
    }
    const ultimo = partes(codigo)[nivel - 1] ?? 0;
    if (ultimo > maior) maior = ultimo;
  }
  return `${prefixo}${maior + 1}`;
}

/**
 * Renumera a árvore inteira a partir da hierarquia e da ordem.
 *
 * É o que responde ao caso que o responsável descreveu: **subitem promovido a
 * etapa vira o número da etapa anterior + 1**, e tudo o que vinha depois anda
 * junto. Renumerar a árvore toda é mais simples e mais correto que tentar
 * remendar o item movido — e é barato, porque EAP de obra tem centenas de
 * linhas, não milhões.
 *
 * Devolve `id → código`. Itens com pai inexistente são tratados como raiz, para
 * que dado inconsistente vindo de importação não suma da tela.
 */
export function renumerar(itens: ItemEAP[]): Map<string, string> {
  const filhos = new Map<string | null, ItemEAP[]>();
  const existentes = new Set(itens.map(i => i.id));

  for (const item of itens) {
    const pai = item.parentId && existentes.has(item.parentId) ? item.parentId : null;
    const lista = filhos.get(pai) ?? [];
    lista.push(item);
    filhos.set(pai, lista);
  }

  for (const lista of filhos.values()) {
    lista.sort((a, b) => {
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
      // Empate de sequência cai para o código atual, e só então para o id —
      // assim a renumeração é estável e não embaralha a tela a cada gravação.
      const porCodigo = compararCodigos(a.code ?? "", b.code ?? "");
      return porCodigo !== 0 ? porCodigo : a.id.localeCompare(b.id);
    });
  }

  const saida = new Map<string, string>();
  function percorrer(pai: string | null, prefixo: string) {
    const lista = filhos.get(pai) ?? [];
    lista.forEach((item, indice) => {
      const codigo = prefixo ? `${prefixo}.${indice + 1}` : String(indice + 1);
      saida.set(item.id, codigo);
      percorrer(item.id, codigo);
    });
  }
  percorrer(null, "");
  return saida;
}

/** Só os itens cujo código mudou — evita gravar linha que não mudou. */
export function diferencas(itens: ItemEAP[]): { id: string; code: string }[] {
  const novo = renumerar(itens);
  const mudou: { id: string; code: string }[] = [];
  for (const item of itens) {
    const codigo = novo.get(item.id);
    if (codigo && codigo !== item.code) mudou.push({ id: item.id, code: codigo });
  }
  return mudou;
}
