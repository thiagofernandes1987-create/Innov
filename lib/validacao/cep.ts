import { somenteDigitos, validarCEP } from "./br";

// Consulta de endereço por CEP.
//
// Roda **no servidor**, nunca no navegador. Dois motivos: a CSP aplicada em
// `next.config.ts` restringe `connect-src` a `'self'` e ao storage do Supabase,
// então um `fetch` para `viacep.com.br` a partir da página seria bloqueado; e
// manter a chamada no servidor evita afrouxar a política por causa de um campo
// de formulário.
//
// Falha sempre para o lado seguro: serviço fora do ar nunca impede o cadastro.
// Preencher endereço é conveniência; o dado que vale é o que o usuário confirma.

export type EnderecoCEP = {
  encontrado: boolean;
  erro?: string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  ibge?: string;
  ddd?: string;
};

const TEMPO_LIMITE_MS = 5000;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * Traduz o corpo do ViaCEP para o vocabulário da plataforma — `localidade`
 * vira `cidade` — e garante que campo ausente vire string vazia, para nunca
 * aparecer `undefined` na tela.
 */
export function interpretarRespostaViaCEP(corpo: unknown): EnderecoCEP {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    return { encontrado: false, erro: "Resposta inválida do serviço de CEP." };
  }
  const dados = corpo as Record<string, unknown>;

  // A API responde `{"erro": true}` ou `{"erro": "true"}` conforme o caso.
  if (dados.erro === true || dados.erro === "true") {
    return { encontrado: false, erro: "CEP não encontrado." };
  }

  return {
    encontrado: true,
    cep: texto(dados.cep),
    logradouro: texto(dados.logradouro),
    complemento: texto(dados.complemento),
    bairro: texto(dados.bairro),
    cidade: texto(dados.localidade),
    uf: texto(dados.uf),
    ibge: texto(dados.ibge),
    ddd: texto(dados.ddd)
  };
}

export async function buscarCEP(cep: string | null | undefined): Promise<EnderecoCEP> {
  const formato = validarCEP(cep);
  if (!formato.valido) return { encontrado: false, erro: formato.erro };

  const digitos = somenteDigitos(cep);
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controle.signal,
      headers: { accept: "application/json" }
    });
    if (!resposta.ok) {
      return { encontrado: false, erro: "Não foi possível consultar o serviço de CEP." };
    }
    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      return { encontrado: false, erro: "Resposta inválida do serviço de CEP." };
    }
    return interpretarRespostaViaCEP(corpo);
  } catch {
    return { encontrado: false, erro: "Não foi possível consultar o serviço de CEP." };
  } finally {
    clearTimeout(relogio);
  }
}
