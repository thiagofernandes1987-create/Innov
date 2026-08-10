// Qual CUB a tela do orçamento oferece, e de qual estado.
//
// T-37.13a. A consulta era `source_key = 'SINDUSCON_SP_CUB'`, fixa. A empresa
// faz obra fora de São Paulo, e nesse caso a tela oferecia o CUB paulista para
// uma obra em Minas **sem dizer**. Referência de custo com a UF errada não erra
// pouco: o CUB varia entre estados na casa das centenas de reais por metro
// quadrado, e o número entra no orçamento com a mesma cara de oficial.
//
// A regra é simples e a ordem importa: **a UF do projeto manda**, porque é onde
// a obra é; o que a pessoa escolher na tela ganha dela, porque às vezes se quer
// comparar; e sigla inválida volta para o padrão em vez de virar filtro vazio —
// "este estado não tem referência" e "não há referência nenhuma" são respostas
// diferentes, e trocar uma pela outra esconde o estado do catálogo.
//
// Lógica pura, sem `server-only`, para ser exercitada em teste.

export const UFS_DO_BRASIL = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
] as const;

export type UfDoBrasil = (typeof UFS_DO_BRASIL)[number];

/**
 * São Paulo é o padrão porque é a única com fonte automática hoje
 * (`cub-fonte.ts`). Não é preferência: é o único estado em que a tela tem o que
 * mostrar sem ninguém importar nada antes.
 */
export const UF_PADRAO: UfDoBrasil = "SP";

const VALIDAS = new Set<string>(UFS_DO_BRASIL);

function normalizar(valor: string | null | undefined): UfDoBrasil | null {
  const sigla = String(valor ?? "").trim().toUpperCase();
  return VALIDAS.has(sigla) ? (sigla as UfDoBrasil) : null;
}

export type ReferenciaDisponivel = {
  id: string;
  region: string;
  reference_code: string;
  base_date: string;
  tax_relief: boolean;
  total_cost: number | string;
};

/** A UF cujo CUB a tela deve mostrar. */
export function ufDaReferencia(entrada: {
  ufDoProjeto: string | null | undefined;
  ufPedida: string | null | undefined;
}): UfDoBrasil {
  return normalizar(entrada.ufPedida) ?? normalizar(entrada.ufDoProjeto) ?? UF_PADRAO;
}

/**
 * As referências daquele estado, da mais recente para a mais antiga.
 *
 * Devolver vazio é resposta, não falha: significa que o estado ainda não tem
 * CUB importado, e cabe à tela dizer isso com essas palavras.
 */
export function referenciasDaUf<T extends ReferenciaDisponivel>(
  referencias: readonly T[],
  uf: string
): T[] {
  const alvo = String(uf ?? "").trim().toUpperCase();
  return referencias
    .filter(item => String(item.region ?? "").trim().toUpperCase() === alvo)
    .sort(
      (a, b) =>
        b.base_date.localeCompare(a.base_date) ||
        Number(b.total_cost) - Number(a.total_cost) ||
        a.reference_code.localeCompare(b.reference_code, "pt-BR")
    );
}
