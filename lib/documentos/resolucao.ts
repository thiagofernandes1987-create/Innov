// Resolução de variáveis contra registro real — T-32.2.5.
//
// **O dicionário respeita a RLS de quem gera.** É a linha da diretriz que este
// arquivo existe para cumprir: as consultas usam o cliente Supabase da sessão,
// nunca o `service_role`. Quem não pode ler um cliente não recebe o nome dele
// numa proposta; a variável vira lacuna, e a lacuna aparece.
//
// Dito ao contrário, que é como a falha aconteceria: se a resolução usasse o
// cliente administrativo "porque é só leitura", o modelo viraria o caminho mais
// curto para extrair da plataforma exatamente o que a permissão nega — bastaria
// escrever `{{cliente.documento}}` num modelo e gerar.
//
// Nada aqui lança. Registro ausente, sem permissão ou campo vazio produzem o
// mesmo resultado — a variável não entra no dicionário —, e quem decide o que
// fazer com isso é `renderizar`, que marca a lacuna no texto.

import { formatarMoeda } from "@/lib/validacao/moeda";

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export type AlvoDaEmissao = {
  clienteId?: string | null;
  obraId?: string | null;
  orcamentoId?: string | null;
  propostaId?: string | null;
};

export type Resolucao = {
  dicionario: Record<string, string | number | null>;
  /** Escopos que encontraram registro. */
  encontrados: string[];
  /**
   * Escopos pedidos que não voltaram nada.
   *
   * Não distingue "não existe" de "você não pode ler" **de propósito**: dizer
   * "existe, mas você não pode ver" já entrega a informação de que existe.
   */
  vazios: string[];
};

const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

function data(valor: unknown): string | null {
  if (!valor) return null;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? null : DATA.format(d);
}

function endereco(linha: Record<string, unknown>): string | null {
  const partes = [linha.address_line, linha.district, linha.city, linha.state]
    .map(p => (p ? String(p).trim() : ""))
    .filter(Boolean);
  if (partes.length === 0) return null;
  const cep = linha.postal_code ? ` — CEP ${String(linha.postal_code)}` : "";
  return partes.join(", ") + cep;
}

/**
 * Monta o dicionário a partir dos registros que o alvo aponta.
 *
 * O escopo `empresa` sai da organização da sessão, e `sistema` do relógio e de
 * quem está gerando — os dois sempre resolvem, por isso não entram em `vazios`.
 */
export async function resolverDicionario(
  supabase: Cliente,
  contexto: { organizationId: string; userId: string; nomeDoAutor?: string | null },
  alvo: AlvoDaEmissao = {}
): Promise<Resolucao> {
  const dicionario: Record<string, string | number | null> = {};
  const encontrados: string[] = [];
  const vazios: string[] = [];

  const agora = new Date();
  dicionario["sistema.hoje"] = DATA.format(agora);
  dicionario["sistema.autor"] = contexto.nomeDoAutor ?? "";

  const { data: org } = await supabase
    .from("organizations")
    .select("legal_name, trade_name, tax_id")
    .eq("id", contexto.organizationId)
    .maybeSingle();
  if (org) {
    dicionario["empresa.razao_social"] = org.legal_name ?? null;
    dicionario["empresa.cnpj"] = org.tax_id ?? null;
    encontrados.push("empresa");
  } else {
    vazios.push("empresa");
  }

  if (alvo.clienteId) {
    const { data: c } = await supabase
      .from("clients")
      .select("legal_name, trade_name, tax_id, email, phone, address_line, city, state, postal_code")
      .eq("id", alvo.clienteId)
      .maybeSingle();
    if (c) {
      const linha = c as Record<string, unknown>;
      dicionario["cliente.nome_completo"] = c.legal_name ?? null;
      dicionario["cliente.nome_fantasia"] = c.trade_name ?? null;
      dicionario["cliente.documento"] = c.tax_id ?? null;
      dicionario["cliente.email_comercial"] = c.email ?? null;
      dicionario["cliente.telefone"] = c.phone ?? null;
      dicionario["cliente.tel_pessoal"] = c.phone ?? null;
      dicionario["cliente.endereco"] = endereco(linha);
      dicionario["cliente.cidade"] = c.city ?? null;
      dicionario["cliente.uf"] = c.state ?? null;
      dicionario["cliente.cep"] = c.postal_code ?? null;
      encontrados.push("cliente");
    } else {
      vazios.push("cliente");
    }
  }

  if (alvo.obraId) {
    const { data: o } = await supabase
      .from("projects")
      .select("code, name, address_line, district, city, state, postal_code, planned_start, planned_end")
      .eq("id", alvo.obraId)
      .maybeSingle();
    if (o) {
      dicionario["obra.codigo"] = o.code ?? null;
      dicionario["obra.nome"] = o.name ?? null;
      dicionario["obra.endereco"] = endereco(o as Record<string, unknown>);
      dicionario["obra.inicio_previsto"] = data(o.planned_start);
      dicionario["obra.termino_previsto"] = data(o.planned_end);
      encontrados.push("obra");
    } else {
      vazios.push("obra");
    }
  }

  if (alvo.orcamentoId) {
    const { data: b } = await supabase
      .from("budgets")
      .select("code, valid_until, current_version_id")
      .eq("id", alvo.orcamentoId)
      .maybeSingle();
    if (b) {
      dicionario["orcamento.codigo"] = b.code ?? null;
      dicionario["orcamento.validade"] = data(b.valid_until);
      if (b.current_version_id) {
        // O valor vem da **versão vigente**, não do orçamento: é ela que carrega
        // o preço, e usar outra faria o documento sair com número que ninguém
        // aprovou.
        const { data: v } = await supabase
          .from("budget_versions")
          .select("sale_price")
          .eq("id", b.current_version_id)
          .maybeSingle();
        dicionario["orcamento.valor_total"] = v?.sale_price != null ? formatarMoeda(Number(v.sale_price)) : null;
      }
      encontrados.push("orcamento");
    } else {
      vazios.push("orcamento");
    }
  }

  if (alvo.propostaId) {
    const { data: p } = await supabase
      .from("proposals")
      .select("code, created_at")
      .eq("id", alvo.propostaId)
      .maybeSingle();
    if (p) {
      dicionario["proposta.numero"] = p.code ?? null;
      dicionario["proposta.data"] = data(p.created_at);
      encontrados.push("proposta");
    } else {
      vazios.push("proposta");
    }
  }

  return { dicionario, encontrados, vazios };
}
