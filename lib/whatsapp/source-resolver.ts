import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hashCanonicalSource,
  renderCanonicalText,
  SOURCE_FIELDS,
  type ResolvedWhatsAppSource,
  type WhatsAppSourceType,
  WhatsAppDomainError
} from "@/lib/whatsapp/domain";

type Binding = {
  id: string;
  organization_id: string;
  name: string;
  source_type: WhatsAppSourceType;
  source_id: string;
  source_field: string;
  meta_template_name: string | null;
  language_code: string;
  parameter_order: string[];
  variables_schema: Record<string, unknown>;
};

type ResolveContext = {
  supabase: SupabaseClient;
  organizationId: string;
};

function assertAllowedField(sourceType: WhatsAppSourceType, sourceField: string) {
  if (!SOURCE_FIELDS[sourceType].includes(sourceField)) {
    throw new WhatsAppDomainError(
      "INVALID_SOURCE",
      "O campo não é permitido para este tipo de fonte."
    );
  }
}

function snapshot(
  sourceType: WhatsAppSourceType,
  sourceId: string,
  sourceField: string,
  sourceVersion: number | null,
  sourceName: string,
  hashInput: string
) {
  return {
    sourceType,
    sourceId,
    sourceField,
    sourceVersion,
    sourceName,
    sha256: hashCanonicalSource(hashInput),
    resolvedAt: new Date().toISOString()
  };
}

export async function loadWhatsAppBinding(
  context: ResolveContext,
  bindingId: string
): Promise<Binding> {
  const { data, error } = await context.supabase
    .from("whatsapp_content_bindings")
    .select(
      "id,organization_id,name,source_type,source_id,source_field,meta_template_name,language_code,parameter_order,variables_schema"
    )
    .eq("id", bindingId)
    .eq("organization_id", context.organizationId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    throw new WhatsAppDomainError("INVALID_SOURCE", "Mensagem padrão não encontrada.");
  }
  return {
    ...data,
    source_type: data.source_type as WhatsAppSourceType,
    parameter_order: Array.isArray(data.parameter_order)
      ? data.parameter_order.map(String)
      : [],
    variables_schema:
      data.variables_schema && typeof data.variables_schema === "object"
        ? (data.variables_schema as Record<string, unknown>)
        : {}
  };
}

export async function resolveWhatsAppBinding(
  context: ResolveContext,
  binding: Binding,
  variables: Record<string, string>
): Promise<ResolvedWhatsAppSource> {
  assertAllowedField(binding.source_type, binding.source_field);

  if (binding.source_type === "CONTRACT_TEMPLATE") {
    const { data, error } = await context.supabase
      .from("contract_templates")
      .select("id,name,version_number,body_template")
      .eq("id", binding.source_id)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Modelo contratual não encontrado.");
    }
    const body = renderCanonicalText(String(data.body_template), variables);
    return {
      kind: "TEXT",
      body,
      snapshot: snapshot(
        binding.source_type,
        data.id,
        binding.source_field,
        Number(data.version_number),
        String(data.name),
        body
      )
    };
  }

  if (binding.source_type === "PROPOSAL_VERSION") {
    const { data, error } = await context.supabase
      .from("proposal_versions")
      .select(
        "id,version_number,title,object_text,scope_text,commercial_summary,payment_terms,deadline_text,warranty_text,notes,document_path,document_sha256"
      )
      .eq("id", binding.source_id)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (error || !data) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Versão de proposta não encontrada.");
    }
    if (binding.source_field === "DOCUMENT") {
      if (!data.document_path) {
        throw new WhatsAppDomainError("INVALID_SOURCE", "A proposta ainda não possui documento.");
      }
      return {
        kind: "DOCUMENT",
        bucket: "commercial-documents",
        storagePath: String(data.document_path),
        fileName: `${String(data.title)}.pdf`,
        mimeType: "application/pdf",
        caption: String(data.title),
        snapshot: snapshot(
          binding.source_type,
          data.id,
          binding.source_field,
          Number(data.version_number),
          String(data.title),
          String(data.document_sha256 ?? data.document_path)
        )
      };
    }
    const fieldMap: Record<string, unknown> = {
      TITLE: data.title,
      OBJECT_TEXT: data.object_text,
      SCOPE_TEXT: data.scope_text,
      COMMERCIAL_SUMMARY: data.commercial_summary,
      PAYMENT_TERMS: data.payment_terms,
      DEADLINE_TEXT: data.deadline_text,
      WARRANTY_TEXT: data.warranty_text,
      NOTES: data.notes
    };
    const body = renderCanonicalText(String(fieldMap[binding.source_field] ?? ""), variables);
    return {
      kind: "TEXT",
      body,
      snapshot: snapshot(
        binding.source_type,
        data.id,
        binding.source_field,
        Number(data.version_number),
        String(data.title),
        body
      )
    };
  }

  if (binding.source_type === "CONTRACT_VERSION") {
    const { data, error } = await context.supabase
      .from("contract_versions")
      .select("id,version_number,rendered_body,document_path,document_sha256,contracts(title)")
      .eq("id", binding.source_id)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (error || !data) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Versão contratual não encontrada.");
    }
    const contract = Array.isArray(data.contracts) ? data.contracts[0] : data.contracts;
    const sourceName = String(contract?.title ?? "Contrato");
    if (binding.source_field === "DOCUMENT") {
      if (!data.document_path) {
        throw new WhatsAppDomainError("INVALID_SOURCE", "O contrato ainda não possui documento.");
      }
      return {
        kind: "DOCUMENT",
        bucket: "contract-documents",
        storagePath: String(data.document_path),
        fileName: `${sourceName}.pdf`,
        mimeType: "application/pdf",
        caption: sourceName,
        snapshot: snapshot(
          binding.source_type,
          data.id,
          binding.source_field,
          Number(data.version_number),
          sourceName,
          String(data.document_sha256 ?? data.document_path)
        )
      };
    }
    const body = renderCanonicalText(String(data.rendered_body), variables);
    return {
      kind: "TEXT",
      body,
      snapshot: snapshot(
        binding.source_type,
        data.id,
        binding.source_field,
        Number(data.version_number),
        sourceName,
        body
      )
    };
  }

  if (binding.source_type === "AMENDMENT_VERSION") {
    const { data, error } = await context.supabase
      .from("amendment_versions")
      .select("id,version_number,rendered_body,document_path,document_sha256,amendments(code)")
      .eq("id", binding.source_id)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (error || !data) {
      throw new WhatsAppDomainError("INVALID_SOURCE", "Versão de aditivo não encontrada.");
    }
    const amendment = Array.isArray(data.amendments) ? data.amendments[0] : data.amendments;
    const sourceName = `Aditivo ${String(amendment?.code ?? "")}`.trim();
    if (binding.source_field === "DOCUMENT") {
      if (!data.document_path) {
        throw new WhatsAppDomainError("INVALID_SOURCE", "O aditivo ainda não possui documento.");
      }
      return {
        kind: "DOCUMENT",
        bucket: "contract-documents",
        storagePath: String(data.document_path),
        fileName: `${sourceName}.pdf`,
        mimeType: "application/pdf",
        caption: sourceName,
        snapshot: snapshot(
          binding.source_type,
          data.id,
          binding.source_field,
          Number(data.version_number),
          sourceName,
          String(data.document_sha256 ?? data.document_path)
        )
      };
    }
    const body = renderCanonicalText(String(data.rendered_body), variables);
    return {
      kind: "TEXT",
      body,
      snapshot: snapshot(
        binding.source_type,
        data.id,
        binding.source_field,
        Number(data.version_number),
        sourceName,
        body
      )
    };
  }

  if (binding.source_type !== "PROJECT_DOCUMENT_VERSION") {
    throw new WhatsAppDomainError("INVALID_SOURCE", "Tipo de fonte não suportado.");
  }

  const { data, error } = await context.supabase
    .from("project_document_versions")
    .select(
      "id,version_number,storage_path,file_name,mime_type,sha256,project_documents(title)"
    )
    .eq("id", binding.source_id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (error || !data) {
    throw new WhatsAppDomainError("INVALID_SOURCE", "Versão de documento não encontrada.");
  }
  const document = Array.isArray(data.project_documents)
    ? data.project_documents[0]
    : data.project_documents;
  const sourceName = String(document?.title ?? data.file_name);
  return {
    kind: "DOCUMENT",
    bucket: "project-documents",
    storagePath: String(data.storage_path),
    fileName: String(data.file_name),
    mimeType: data.mime_type ? String(data.mime_type) : null,
    caption: sourceName,
    snapshot: snapshot(
      binding.source_type,
      data.id,
      binding.source_field,
      Number(data.version_number),
      sourceName,
      String(data.sha256 ?? data.storage_path)
    )
  };
}
