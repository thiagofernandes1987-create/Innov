"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { lerDeclaracaoDeCub } from "@/lib/orcamentos/cub-manual";
import { campoDeTexto } from "@/lib/forms/campos";

// Registro manual do CUB estadual. T-37.13b.
//
// A validação do formulário continua detalhada em `lerDeclaracaoDeCub`.
// A RPC permanece responsável pelas invariantes transacionais, mas mensagens
// técnicas do PostgREST não atravessam a fronteira da action: o identificador
// estável do provedor vai para o log e a interface recebe uma mensagem funcional.

function paginaDeImportacao(
  parametros: { uf: string; voltar?: string | null },
  chave: "error" | "success",
  mensagem: string
): never {
  const busca = new URLSearchParams({ uf: parametros.uf, [chave]: mensagem });
  if (parametros.voltar) busca.set("voltar", parametros.voltar);
  redirect(`/app/orcamentos/cub/importar?${busca.toString()}`);
}

export async function registrarCubManual(formData: FormData) {
  const campos = Object.fromEntries(
    ["uf", "tipologia", "mes", "desonerado", "total", "material", "maoDeObra",
     "administrativo", "fonte", "endereco", "publicacao", "arquivoSha256"]
      .map(chave => [chave, campoDeTexto(formData, chave)])
  );
  const voltar = String(formData.get("voltar") ?? "").trim() || null;
  const ufDoFormulario = campos.uf.trim().toUpperCase() || "SP";

  const leitura = lerDeclaracaoDeCub(campos);
  if (!leitura.ok) paginaDeImportacao({ uf: ufDoFormulario, voltar }, "error", leitura.problema);

  const { declaracao } = leitura;
  const { supabase, organizationId } = await requireOrganizationContext();

  const { error } = await supabase.rpc("registrar_cub_manual", {
    p_organization_id: organizationId,
    p_region: declaracao.uf,
    p_reference_code: declaracao.tipologia,
    p_base_date: declaracao.dataBase,
    p_tax_relief: declaracao.desonerado,
    p_total_cost: declaracao.total,
    p_materials_cost: declaracao.material,
    p_labor_cost: declaracao.maoDeObra,
    p_administrative_cost: declaracao.administrativo,
    p_source_name: declaracao.fonte,
    p_source_url: declaracao.endereco,
    p_publication_date: declaracao.publicacao,
    p_arquivo_sha256: declaracao.arquivoSha256
  });

  if (error) {
    reportDataAccessError("cub.register-manual-reference", error);
    paginaDeImportacao(
      { uf: declaracao.uf, voltar },
      "error",
      "O CUB não pôde ser registrado."
    );
  }

  revalidatePath("/app/orcamentos/cub/importar");
  if (voltar) revalidatePath(`/app/orcamentos/${voltar}`);

  const mes = new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${declaracao.dataBase}T12:00:00Z`));
  paginaDeImportacao(
    { uf: declaracao.uf, voltar },
    "success",
    `CUB ${declaracao.tipologia} de ${mes} registrado para ${declaracao.uf}. A referência já aparece no orçamento daquele estado.`
  );
}
