import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { generateCommercialPdf, sha256Hex } from "@/lib/pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "COMERCIAL"]);

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
    .from("proposal_versions")
    .select(`
      id, proposal_id, version_number, title, object_text, scope_text, inclusions,
      exclusions, assumptions, commercial_summary, sale_price, payment_terms,
      deadline_text, warranty_text, notes, document_path, document_sha256,
      client_released_at,
      proposals!proposal_versions_proposal_id_fkey!inner(
        id, organization_id, client_id, code, status, valid_until,
        clients!inner(legal_name, trade_name)
      )
    `)
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    reportDataAccessError("proposals.pdf.load-version", error);
    return NextResponse.json({ error: "Não foi possível carregar a versão da proposta." }, { status: 500 });
  }
  if (!version) {
    return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
  }

  const proposal = version.proposals as unknown as {
    id: string;
    organization_id: string;
    client_id: string;
    code: string;
    status: string;
    valid_until: string | null;
    clients: { legal_name: string; trade_name: string | null };
  };

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", proposal.organization_id)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();

  if (membershipError) {
    reportDataAccessError("proposals.pdf.membership", membershipError);
    return NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 });
  }
  if (!membership || !allowedRoles.has(membership.role)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  if (version.document_path && version.document_sha256) {
    return NextResponse.json({
      data: {
        path: version.document_path,
        sha256: version.document_sha256,
        idempotent: true
      }
    });
  }

  const clientName = proposal.clients.trade_name || proposal.clients.legal_name;
  const pdf = await generateCommercialPdf({
    documentType: "PROPOSTA",
    code: proposal.code,
    version: version.version_number,
    title: version.title,
    clientName,
    issueDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    validUntil: proposal.valid_until,
    commercialValue: Number(version.sale_price),
    currency: "BRL",
    sections: [
      { title: "Objeto", body: version.object_text },
      { title: "Escopo", body: version.scope_text },
      { title: "Inclusões", body: version.inclusions || "Conforme escopo apresentado." },
      { title: "Exclusões", body: version.exclusions || "Não há exclusões adicionais registradas." },
      { title: "Premissas", body: version.assumptions || "Conforme reunião e documentos de referência." },
      { title: "Condições de pagamento", body: version.payment_terms || "A definir no contrato." },
      { title: "Prazo", body: version.deadline_text || "A definir no planejamento executivo." },
      { title: "Garantias", body: version.warranty_text || "Conforme legislação e contrato." },
      { title: "Observações", body: version.notes || "-" }
    ]
  });

  const sha256 = sha256Hex(pdf);
  const path = `${proposal.organization_id}/${proposal.id}/v${version.version_number}-${sha256.slice(0, 12)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("commercial-documents")
    .upload(path, Buffer.from(pdf), {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600"
    });

  if (uploadError) {
    reportDataAccessError("proposals.pdf.upload", uploadError);
    return NextResponse.json({ error: "Não foi possível armazenar o PDF da proposta." }, { status: 500 });
  }

  const snapshot = {
    proposal_code: proposal.code,
    proposal_version: version.version_number,
    client_name: clientName,
    sale_price: Number(version.sale_price),
    valid_until: proposal.valid_until,
    generated_at: new Date().toISOString(),
    idempotency_key_hash: sha256Hex(new TextEncoder().encode(idempotencyKey))
  };

  const { error: updateError } = await supabase
    .from("proposal_versions")
    .update({
      document_path: path,
      document_sha256: sha256,
      frozen_at: new Date().toISOString(),
      source_snapshot: snapshot
    })
    .eq("id", version.id)
    .is("document_path", null);

  if (updateError) {
    reportDataAccessError("proposals.pdf.freeze-version", updateError);
    const { error: cleanupError } = await supabase.storage.from("commercial-documents").remove([path]);
    if (cleanupError) reportDataAccessError("proposals.pdf.cleanup", cleanupError);
    return NextResponse.json({ error: "Não foi possível concluir a geração do PDF da proposta." }, { status: 500 });
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    organization_id: proposal.organization_id,
    actor_user_id: authData.user.id,
    event_type: "proposal.pdf.generated",
    resource_type: "PROPOSAL_VERSION",
    resource_id: version.id,
    action: "GENERATE_PDF",
    after_data: { path, sha256 },
    result: "SUCCESS"
  });
  if (auditError) reportDataAccessError("proposals.pdf.audit", auditError);

  return NextResponse.json({ data: { path, sha256, idempotent: false } }, { status: 201 });
}
