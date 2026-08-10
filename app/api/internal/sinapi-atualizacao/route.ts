import "server-only";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { runSinapiAutomaticUpdate } from "@/lib/sinapi/automatic-update";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// **Onde a importação do SINAPI roda.** T-37.2.
//
// A decisão de segurança em vigor é que `SUPABASE_SERVICE_ROLE_KEY` não vai
// para o deploy público. Só que `start_sinapi_import` e as três RPCs de
// gravação recusam quem não é `service_role`: sem a chave, o botão da tela não
// tem como completar a importação. Faltava o lugar de rodar, não o código.
//
// O lugar é o trabalho agendado (`.github/workflows/sinapi-atualizacao.yml`),
// que **já guarda essa chave** e a usa em três workflows — homologação da
// Etapa 11, concorrência da 18 e do inventário da 20. Não é superfície de
// confiança nova: é a que já existe, para a mesma classe de tarefa. Ele sobe
// uma instância própria do app, com a chave no ambiente **efêmero do runner**,
// e chama esta rota.
//
// A alternativa era tirar a importação da tela e aceitar arquivo enviado à
// mão. Custaria afrouxar `start_sinapi_import` para aceitar chamador
// autenticado comum — alargar privilégio permanente por causa de uma tarefa
// mensal. Troca ruim.
//
// **Falha fechada.** O segredo segue a convenção de
// `/api/cost-sources/sinapi/import`: ausente ou curto demais, ninguém entra.
// No deploy público, onde nem o segredo nem a chave existem, a rota responde
// 401 antes de tocar em qualquer coisa.

function autorizado(request: Request) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo || segredo.length < 32) return false;
  const recebido = request.headers.get("authorization");
  return recebido === `Bearer ${segredo}`;
}

export async function POST(request: Request) {
  if (!autorizado(request)) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }

  let corpo: { organizationId?: unknown; region?: unknown; taxRelief?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ status: "invalid_payload", message: "JSON inválido." }, { status: 400 });
  }

  const organizationId = String(corpo.organizationId ?? "").trim();
  const region = String(corpo.region ?? "").trim().toUpperCase();
  const taxRelief = corpo.taxRelief === true;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
    return Response.json({ status: "invalid_payload", message: "organizationId inválido." }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(region)) {
    return Response.json({ status: "invalid_payload", message: "region inválida." }, { status: 400 });
  }

  try {
    const resultado = await runSinapiAutomaticUpdate({ organizationId, region, taxRelief });
    return Response.json({ status: "ok", resultado }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    reportDataAccessError("sinapi-automatic-update.route", error);
    return Response.json(
      {
        status: "failed",
        region,
        taxRelief,
        message: "A atualização automática do SINAPI não pôde ser concluída."
      },
      { status: 502 }
    );
  }
}
