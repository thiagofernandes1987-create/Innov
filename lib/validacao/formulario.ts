import {
  validarCEP,
  validarDocumento,
  validarEmail,
  validarTelefone,
  type Resultado,
  type TipoPessoa
} from "./br";

// Guarda de servidor para os campos brasileiros.
//
// A ação chama isto antes de gravar. O formulário no navegador orienta; quem
// recusa é a ação — sem esta camada, a validação some quando alguém envia o
// formulário fora da tela, e foi assim que CPF de 10 dígitos e CEP em letras
// chegaram ao banco.

export type TipoCampo = "documento" | "cep" | "telefone" | "email";

export type CampoBR = {
  /** Nome do campo no `FormData`. */
  campo: string;
  tipo: TipoCampo;
  /** Rótulo exibido na mensagem. Sem ele, usa o nome do campo. */
  rotulo?: string;
  /** Campo em branco vira erro. Por padrão, branco é aceito. */
  obrigatorio?: boolean;
  /** Nome do campo que informa `PERSON` ou `COMPANY`, para escolher CPF ou CNPJ. */
  campoTipoPessoa?: string;
};

function ler(data: FormData, campo: string): string {
  return String(data.get(campo) ?? "").trim();
}

function validar(tipo: TipoCampo, valor: string, tipoPessoa?: TipoPessoa): Resultado {
  if (tipo === "documento") return validarDocumento(valor, tipoPessoa);
  if (tipo === "cep") return validarCEP(valor);
  if (tipo === "telefone") return validarTelefone(valor);
  return validarEmail(valor);
}

/**
 * Devolve a mensagem do **primeiro** campo inválido, ou `null` quando tudo
 * passa. Um erro por vez: despejar a lista inteira faz o usuário reler tudo
 * a cada tentativa em vez de corrigir o que está na frente dele.
 */
export function checarCamposBR(data: FormData, campos: readonly CampoBR[]): string | null {
  for (const definicao of campos) {
    const valor = ler(data, definicao.campo);
    const rotulo = definicao.rotulo ?? definicao.campo;

    if (!valor) {
      if (definicao.obrigatorio) return `${rotulo}: informe um valor.`;
      continue;
    }

    const tipoPessoa = definicao.campoTipoPessoa
      ? (ler(data, definicao.campoTipoPessoa) as TipoPessoa) || undefined
      : undefined;

    const resultado = validar(definicao.tipo, valor, tipoPessoa);
    if (!resultado.valido) return `${rotulo}: ${resultado.erro}`;
  }
  return null;
}
