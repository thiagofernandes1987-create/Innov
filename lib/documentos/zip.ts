// Leitor de ZIP, para abrir `.docx` e `.xlsx` sem dependência.
//
// Os dois formatos são ZIP com XML dentro, e o navegador já sabe descomprimir:
// `DecompressionStream("deflate-raw")` é padrão e está em Chrome, Firefox e
// Safari desde 2023. Node 18 em diante também tem, o que deixa a conversão
// testável fora do navegador.
//
// Só o essencial: diretório central, nome e dados de cada arquivo, sem
// compressão além de "guardado" e "deflate" — que são as duas que o Word e o
// Excel usam. ZIP criptografado, dividido em volumes ou com Zip64 é recusado
// com mensagem, não lido pela metade.

const ASSINATURA_FIM = 0x06054b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_LOCAL = 0x04034b50;

export type ArquivoDoZip = { nome: string; dados: Uint8Array };

export class ZipInvalido extends Error {}

async function inflar(comprimido: Uint8Array): Promise<Uint8Array> {
  const entrada = new Blob([comprimido as BlobPart]).stream();
  const saida = entrada.pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(saida).arrayBuffer());
}

/** Lê o pacote e devolve apenas os arquivos cujo nome interessa. */
export async function lerZip(
  bytes: ArrayBuffer | Uint8Array,
  querido: (nome: string) => boolean = () => true
): Promise<Map<string, Uint8Array>> {
  const dados = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const visao = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);

  // O fim do diretório central fica no rabo do arquivo, depois de um comentário
  // de tamanho variável. Procura-se de trás para frente.
  let fim = -1;
  for (let i = dados.length - 22; i >= Math.max(0, dados.length - 66_000); i--) {
    if (visao.getUint32(i, true) === ASSINATURA_FIM) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new ZipInvalido("O arquivo não é um pacote ZIP válido.");

  const quantidade = visao.getUint16(fim + 10, true);
  let ponteiro = visao.getUint32(fim + 16, true);
  if (quantidade === 0xffff || ponteiro === 0xffffffff) {
    throw new ZipInvalido("Pacote em formato Zip64, que este leitor não abre.");
  }

  const encontrados = new Map<string, Uint8Array>();
  const decodificador = new TextDecoder("utf-8");

  for (let n = 0; n < quantidade; n++) {
    if (visao.getUint32(ponteiro, true) !== ASSINATURA_CENTRAL) {
      throw new ZipInvalido("O índice do pacote está corrompido.");
    }
    const sinalizadores = visao.getUint16(ponteiro + 8, true);
    const metodo = visao.getUint16(ponteiro + 10, true);
    const tamanhoComprimido = visao.getUint32(ponteiro + 20, true);
    const tamanhoNome = visao.getUint16(ponteiro + 28, true);
    const tamanhoExtra = visao.getUint16(ponteiro + 30, true);
    const tamanhoComentario = visao.getUint16(ponteiro + 32, true);
    const inicioLocal = visao.getUint32(ponteiro + 42, true);
    const nome = decodificador.decode(dados.subarray(ponteiro + 46, ponteiro + 46 + tamanhoNome));
    ponteiro += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;

    if (!querido(nome)) continue;
    if (sinalizadores & 0x1) throw new ZipInvalido("O arquivo está protegido por senha.");
    if (metodo !== 0 && metodo !== 8) {
      throw new ZipInvalido(`O arquivo usa uma compressão que este leitor não abre (método ${metodo}).`);
    }

    if (visao.getUint32(inicioLocal, true) !== ASSINATURA_LOCAL) {
      throw new ZipInvalido("O conteúdo do pacote não corresponde ao índice.");
    }
    const nomeLocal = visao.getUint16(inicioLocal + 26, true);
    const extraLocal = visao.getUint16(inicioLocal + 28, true);
    const inicioDados = inicioLocal + 30 + nomeLocal + extraLocal;
    const bruto = dados.subarray(inicioDados, inicioDados + tamanhoComprimido);
    encontrados.set(nome, metodo === 0 ? bruto : await inflar(bruto));
  }
  return encontrados;
}

/** Conveniência: lê os arquivos pedidos já como texto. */
export async function lerZipComoTexto(
  bytes: ArrayBuffer | Uint8Array,
  nomes: readonly string[]
): Promise<Record<string, string | undefined>> {
  const querido = new Set(nomes);
  const encontrados = await lerZip(bytes, nome => querido.has(nome));
  const decodificador = new TextDecoder("utf-8");
  const saida: Record<string, string | undefined> = {};
  for (const nome of nomes) {
    const dados = encontrados.get(nome);
    saida[nome] = dados ? decodificador.decode(dados) : undefined;
  }
  return saida;
}
