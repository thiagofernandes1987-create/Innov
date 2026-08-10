import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { generateCommercialPdf, sha256Hex } from "@/lib/pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR"]);

type RouteContext = { params: Promise<{ versionId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key obrigatório." }, { status: 400 });
  }

  const { versionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: version, error } = await supabase
    .from("contract_versions")
    .select(`
      id, contract_id, version_number, rendered_body, value, currency,
      document_path, document_sha256, frozen_at, client_released_at,
      contracts!contract_versions_contract_id_fkey!inner(
        id, organization_id, client_id, code, title, status, starts_at, ends_at,
        clients!inner(legal_name, trade_name)
      )
    `)
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    reportDataAccessError("contracts.pdf.load-version", error);
    return NextResponse.json({ error: "Não foi possível carregar a versão do contrato." }, { status: 500 });
  }
  if (!version) {
    return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
  }

  const contract = version.contracts as unknown as {
    id: string;
    organization_id: string;
    client_id: string;
    code: string;
    title: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    clients: { legal_name: string; trade_name: string | null };
  };

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", contract.organization_id)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();

  if (membershipError) {
    reportDataAccessError("contracts.pdf.membership", membershipError);
    return NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 });
  }
  if (!membership || !allowedRoles.has(membership.role)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  if (version.document_path && version.document_sha256) {
    return NextResponse.json({ data: { path: version.document_path, sha256: version.document_sha256, idempotent: true } });
  }

  const clientName = contract.clients.trade_name || contract.clients.legal_name;
  const pdf = await generateCommercialPdf({
    documentType: "CONTRATO",
    code: contract.code,
    version: version.version_number,
    title: contract.title,
    clientName,
    issueDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    commercialValue: Number(version.value),
    currency: version.currency,
    sections: [
      { title: "Instrumento contratual", body: version.rendered_body },
      { title: "Vigência", body: `${contract.starts_at ?? "A definir"} a ${contract.ends_at ?? "A definir"}` },
      { title: "Assinaturas", body: "A validade jurídica depende da conclusão do envelope no provedor eletrônico contratado." }
    ],
    footerNote: "Contrato versionado. A integridade deve ser confirmada pelo hash SHA-256 e pela trilha de assinatura."
  });

  const sha256 = sha256Hex(pdf);
  const path = `${contract.organization_id}/${contract.id}/v${version.version_number}-${sha256.slice(0, 12)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("contract-documents")
    .upload(path, Buffer.from(pdf), { contentType: "application/pdf", upsert: false, cacheControl: "3600" });

  if (uploadError) {
    reportDataAccessError("contracts.pdf.upload", uploadError);
    return NextResponse.json({ error: "Não foi possível armazenar o PDF do contrato." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("contract_versions")
    .update({
      document_path: path,
      document_sha256: sha256,
      frozen_at: new Date().toISOString(),
      status: "INTERNAL_REVIEW"
    })
    .eq("id", version.id)
    .is("document_path", null);

  if (updateError) {
    reportDataAccessError("contracts.pdf.freeze-version", updateError);
    const { error: cleanupError } = await supabase.storage.from("contract-documents").remove([path]);
    if (cleanupError) reportDataAccessError("contracts.pdf.cleanup", cleanupError);
    return NextResponse.json({ error: "Não foi possível concluir a geração do PDF do contrato." }, { status: 500 });
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    organization_id: contract.organization_id,
    actor_user_id: authData.user.id,
    event_type: "contract.pdf.generated",
    resource_type: "CONTRACT_VERSION",
    resource_id: version.id,
    action: "GENERATE_PDF",
    result: "SUCCESS",
    after_data: {
      path,
      sha256,
      idempotency_key_hash: sha256Hex(new TextEncoder().encode(idempotencyKey))
    }
  });
  if (auditError) reportDataAccessError("contracts.pdf.audit", auditError);

  return NextResponse.json({ data: { path, sha256, idempotent: false } }, { status: 201 });
}
