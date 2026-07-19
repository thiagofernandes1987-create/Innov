import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_CLIENT_PASSWORD"
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
}

if (process.env.ALLOW_INSECURE_DEMO_USERS !== "true") {
  throw new Error("Defina ALLOW_INSECURE_DEMO_USERS=true somente em homologação.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@innov.eng.br";
const clientEmail = process.env.DEMO_CLIENT_EMAIL ?? "cliente@cliente.com";
const runId = `S11-${Date.now()}`;
const code = runId.replace(/[^A-Z0-9]/g, "").slice(-16);

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const admin = createClient(url, publishableKey, {
  auth: { autoRefreshToken: true, persistSession: false }
});
const client = createClient(url, publishableKey, {
  auth: { autoRefreshToken: true, persistSession: false }
});

const ids = {
  markup: null,
  budget: null,
  budgetVersion: null,
  approval: null,
  proposal: null,
  proposalVersion: null,
  contract: null,
  contractVersion: null,
  contractEnvelope: null,
  amendment: null,
  amendmentVersion: null,
  amendmentEnvelope: null,
  factor: null
};

function fail(message, details) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assertEqual(actual, expected, label, tolerance = 0) {
  const numeric = typeof actual === "number" && typeof expected === "number";
  const matches = numeric ? Math.abs(actual - expected) <= tolerance : actual === expected;
  if (!matches) fail(`${label}: esperado ${expected}, recebido ${actual}`);
}

async function unwrap(promise, label) {
  const { data, error } = await promise;
  if (error) fail(label, error);
  return data;
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of normalized) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error(`Base32 inválido: ${char}`);
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret, offset = 0) {
  const key = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + offset;
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(message).digest();
  const position = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[position] & 0x7f) << 24) |
    ((digest[position + 1] & 0xff) << 16) |
    ((digest[position + 2] & 0xff) << 8) |
    (digest[position + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function cleanup() {
  const envelopes = [ids.contractEnvelope, ids.amendmentEnvelope].filter(Boolean);
  if (envelopes.length) {
    await service.from("signature_events").delete().in("envelope_id", envelopes);
    await service.from("signature_signers").delete().in("envelope_id", envelopes);
    await service.from("signature_envelopes").delete().in("id", envelopes);
  }

  if (ids.amendment) {
    await service.from("amendments").update({ current_version_id: null }).eq("id", ids.amendment);
    await service.from("amendment_versions").delete().eq("amendment_id", ids.amendment);
    await service.from("amendments").delete().eq("id", ids.amendment);
  }

  if (ids.contract) {
    await service.from("contracts").update({ current_version_id: null }).eq("id", ids.contract);
    await service.from("contract_versions").delete().eq("contract_id", ids.contract);
    await service.from("contracts").delete().eq("id", ids.contract);
  }

  if (ids.proposal) {
    if (ids.proposalVersion) {
      await service.from("proposal_acceptances").delete().eq("proposal_version_id", ids.proposalVersion);
    }
    await service.from("proposals").update({ current_version_id: null }).eq("id", ids.proposal);
    await service.from("proposal_versions").delete().eq("proposal_id", ids.proposal);
    await service.from("proposals").delete().eq("id", ids.proposal);
  }

  if (ids.budget) {
    if (ids.budgetVersion) {
      await service.from("budget_validation_results").delete().eq("budget_version_id", ids.budgetVersion);
      await service.from("budget_approvals").delete().eq("budget_version_id", ids.budgetVersion);
      await service.from("budget_items").delete().eq("budget_version_id", ids.budgetVersion);
      await service.from("budget_sections").delete().eq("budget_version_id", ids.budgetVersion);
      await service.from("budget_scenarios").delete().eq("budget_version_id", ids.budgetVersion);
    }
    await service.from("budgets").update({ current_version_id: null }).eq("id", ids.budget);
    await service.from("budget_versions").delete().eq("budget_id", ids.budget);
    await service.from("budgets").delete().eq("id", ids.budget);
  }

  const resources = [
    ids.budget,
    ids.budgetVersion,
    ids.approval,
    ids.proposalVersion,
    ids.contract,
    ids.contractEnvelope,
    ids.amendment,
    ids.amendmentEnvelope
  ].filter(Boolean);
  if (resources.length) await service.from("audit_events").delete().in("resource_id", resources);
  if (ids.markup) await service.from("markup_models").delete().eq("id", ids.markup);
  if (ids.factor) await admin.auth.mfa.unenroll({ factorId: ids.factor }).catch(() => undefined);
}

async function elevateToAal2() {
  const factors = await unwrap(admin.auth.mfa.listFactors(), "Listar fatores MFA");
  for (const factor of factors.totp.filter((item) => item.friendly_name?.startsWith("stage11-"))) {
    await admin.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
  }

  const enrolled = await unwrap(
    admin.auth.mfa.enroll({ factorType: "totp", friendlyName: `stage11-${runId}` }),
    "Cadastrar TOTP"
  );
  ids.factor = enrolled.id;
  const secret = enrolled.totp?.secret;
  if (!secret) fail("O Supabase não retornou o segredo TOTP");

  const challenge = await unwrap(
    admin.auth.mfa.challenge({ factorId: enrolled.id }),
    "Criar desafio TOTP"
  );

  let verified = false;
  let lastError;
  for (const offset of [0, -1, 1]) {
    const result = await admin.auth.mfa.verify({
      factorId: enrolled.id,
      challengeId: challenge.id,
      code: totp(secret, offset)
    });
    if (!result.error) {
      verified = true;
      break;
    }
    lastError = result.error;
  }
  if (!verified) fail("Falha ao verificar TOTP", lastError);

  const aal = await unwrap(
    admin.auth.mfa.getAuthenticatorAssuranceLevel(),
    "Confirmar AAL2"
  );
  assertEqual(aal.currentLevel, "aal2", "Nível de autenticação");
}

async function main() {
  const adminSession = await unwrap(
    admin.auth.signInWithPassword({
      email: adminEmail,
      password: process.env.DEMO_ADMIN_PASSWORD
    }),
    "Login administrador"
  );
  const clientSession = await unwrap(
    client.auth.signInWithPassword({
      email: clientEmail,
      password: process.env.DEMO_CLIENT_PASSWORD
    }),
    "Login cliente"
  );

  const adminUserId = adminSession.user.id;
  const clientUserId = clientSession.user.id;

  const membership = await unwrap(
    service
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", adminUserId)
      .eq("active", true)
      .single(),
    "Localizar organização do administrador"
  );
  const organizationId = membership.organization_id;

  const clientRecord = await unwrap(
    service
      .from("clients")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", clientUserId)
      .single(),
    "Localizar cliente"
  );
  const clientId = clientRecord.id;

  ids.markup = crypto.randomUUID();
  await unwrap(
    admin.from("markup_models").insert({
      id: ids.markup,
      organization_id: organizationId,
      name: `Markup ${runId}`,
      method: "MULTIPLIER",
      multiplier: 1.25,
      created_by: adminUserId
    }),
    "Criar markup"
  );

  ids.budget = await unwrap(
    admin.rpc("create_budget", {
      p_organization_id: organizationId,
      p_client_id: clientId,
      p_code: `ORC-${code}`,
      p_title: `Orçamento ${runId}`,
      p_valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      p_project_id: null,
      p_opportunity_id: null
    }),
    "Criar orçamento"
  );

  const budget = await unwrap(
    admin.from("budgets").select("current_version_id").eq("id", ids.budget).single(),
    "Ler versão do orçamento"
  );
  ids.budgetVersion = budget.current_version_id;

  await unwrap(
    admin
      .from("budget_versions")
      .update({ markup_model_id: ids.markup, invested_capital: 10000 })
      .eq("id", ids.budgetVersion),
    "Configurar orçamento"
  );

  await unwrap(
    admin.from("budget_items").insert([
      {
        organization_id: organizationId,
        budget_version_id: ids.budgetVersion,
        cost_type: "DIRECT",
        code: "MAT",
        description: "Material",
        unit: "un",
        quantity: 100,
        unit_cost: 50,
        loss_rate: 0.1,
        freight_rate: 0,
        sequence: 1,
        created_by: adminUserId
      },
      {
        organization_id: organizationId,
        budget_version_id: ids.budgetVersion,
        cost_type: "INDIRECT",
        code: "IND",
        description: "Indireto",
        unit: "un",
        quantity: 10,
        unit_cost: 100,
        loss_rate: 0,
        freight_rate: 0,
        sequence: 2,
        created_by: adminUserId
      },
      {
        organization_id: organizationId,
        budget_version_id: ids.budgetVersion,
        cost_type: "FIXED",
        code: "FIX",
        description: "Fixo",
        unit: "un",
        quantity: 1,
        unit_cost: 500,
        loss_rate: 0,
        freight_rate: 0,
        sequence: 3,
        created_by: adminUserId
      },
      {
        organization_id: organizationId,
        budget_version_id: ids.budgetVersion,
        cost_type: "ADMINISTRATIVE",
        code: "ADM",
        description: "Administrativo",
        unit: "un",
        quantity: 1,
        unit_cost: 250,
        loss_rate: 0,
        freight_rate: 0,
        sequence: 4,
        created_by: adminUserId
      }
    ]),
    "Inserir itens"
  );

  const calculated = await unwrap(
    admin.rpc("calculate_budget_version", { p_version_id: ids.budgetVersion }),
    "Calcular orçamento"
  );
  assertEqual(Number(calculated.direct_cost), 5500, "Custo direto");
  assertEqual(Number(calculated.indirect_cost), 1000, "Custo indireto");
  assertEqual(Number(calculated.fixed_cost), 500, "Custo fixo");
  assertEqual(Number(calculated.administrative_fee), 250, "Taxa administrativa");
  assertEqual(Number(calculated.sale_price), 9062.5, "Preço de venda");
  assertEqual(Number(calculated.estimated_profit), 1812.5, "Lucro estimado");
  assertEqual(Number(calculated.gross_margin_rate), 0.2, "Margem", 0.00000001);
  assertEqual(Number(calculated.estimated_roi_rate), 0.18125, "ROI", 0.00000001);

  await unwrap(
    admin.rpc("freeze_budget_version", { p_version_id: ids.budgetVersion }),
    "Congelar orçamento"
  );
  const mutation = await admin
    .from("budget_items")
    .update({ quantity: 999 })
    .eq("budget_version_id", ids.budgetVersion);
  if (!mutation.error) fail("Item congelado pôde ser alterado");

  ids.approval = crypto.randomUUID();
  await unwrap(
    admin.from("budget_approvals").insert({
      id: ids.approval,
      organization_id: organizationId,
      budget_version_id: ids.budgetVersion,
      approval_type: "STANDARD",
      requested_by: adminUserId,
      minimum_role: "SUPER_ADMIN",
      requires_aal2: true,
      status: "PENDING"
    }),
    "Criar aprovação"
  );

  const aal1Decision = await admin.rpc("decide_budget_approval", {
    p_approval_id: ids.approval,
    p_decision: "APPROVED",
    p_reason: "Tentativa AAL1"
  });
  if (!aal1Decision.error) fail("Aprovação AAL1 não foi bloqueada");

  await elevateToAal2();
  await unwrap(
    admin.rpc("decide_budget_approval", {
      p_approval_id: ids.approval,
      p_decision: "APPROVED",
      p_reason: "Aprovado em AAL2"
    }),
    "Aprovar orçamento"
  );

  ids.proposal = crypto.randomUUID();
  ids.proposalVersion = crypto.randomUUID();
  await unwrap(
    admin.from("proposals").insert({
      id: ids.proposal,
      organization_id: organizationId,
      client_id: clientId,
      budget_id: ids.budget,
      code: `PROP-${code}`,
      status: "APPROVED",
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      created_by: adminUserId
    }),
    "Criar proposta"
  );

  await unwrap(
    admin.from("proposal_versions").insert({
      id: ids.proposalVersion,
      organization_id: organizationId,
      proposal_id: ids.proposal,
      budget_version_id: ids.budgetVersion,
      version_number: 1,
      title: `Proposta ${runId}`,
      object_text: "Execução de obra de homologação",
      scope_text: "Escopo completo E2E",
      sale_price: 9062.5,
      frozen_at: new Date().toISOString(),
      document_path: `${organizationId}/proposals/${runId}.pdf`,
      document_sha256: crypto.createHash("sha256").update(runId).digest("hex"),
      created_by: adminUserId
    }),
    "Criar versão da proposta"
  );

  await unwrap(
    admin.from("proposals").update({ current_version_id: ids.proposalVersion }).eq("id", ids.proposal),
    "Vincular proposta"
  );
  await unwrap(
    admin.rpc("release_proposal_version", { p_proposal_version_id: ids.proposalVersion }),
    "Liberar proposta"
  );

  const clientProposal = await unwrap(
    client.from("proposal_versions").select("id").eq("id", ids.proposalVersion),
    "Cliente lê proposta"
  );
  assertEqual(clientProposal.length, 1, "Proposta visível ao cliente");

  const hiddenBudget = await unwrap(
    client.from("budgets").select("id").eq("id", ids.budget),
    "Cliente consulta orçamento interno"
  );
  assertEqual(hiddenBudget.length, 0, "Orçamento oculto do cliente");

  await unwrap(
    client.rpc("accept_proposal", {
      p_proposal_version_id: ids.proposalVersion,
      p_decision: "ACCEPTED",
      p_comment: "Aceite E2E"
    }),
    "Cliente aceita proposta"
  );

  ids.contract = await unwrap(
    admin.rpc("create_contract_from_proposal", {
      p_proposal_version_id: ids.proposalVersion,
      p_contract_code: `CONT-${code}`,
      p_contract_title: `Contrato ${runId}`,
      p_rendered_body: "Contrato gerado automaticamente.",
      p_template_id: null
    }),
    "Criar contrato"
  );

  const contract = await unwrap(
    admin.from("contracts").select("current_version_id").eq("id", ids.contract).single(),
    "Ler contrato"
  );
  ids.contractVersion = contract.current_version_id;
  const now = new Date().toISOString();

  await unwrap(
    admin
      .from("contracts")
      .update({
        starts_at: now.slice(0, 10),
        ends_at: new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10),
        client_released_at: now
      })
      .eq("id", ids.contract),
    "Liberar contrato"
  );

  await unwrap(
    admin
      .from("contract_versions")
      .update({
        frozen_at: now,
        client_released_at: now,
        document_path: `${organizationId}/contracts/${runId}.pdf`,
        document_sha256: crypto.createHash("sha256").update(`contract-${runId}`).digest("hex")
      })
      .eq("id", ids.contractVersion),
    "Liberar versão contratual"
  );

  ids.contractEnvelope = await unwrap(
    admin.rpc("create_sandbox_signature_envelope", {
      p_contract_version_id: ids.contractVersion,
      p_amendment_version_id: null,
      p_idempotency_key: `${runId}-contract`,
      p_signers: [
        {
          name: "Cliente de Homologação",
          email: clientEmail,
          role: "CONTRATANTE",
          order: 1
        }
      ]
    }),
    "Criar envelope contratual"
  );

  await unwrap(
    admin.rpc("create_sandbox_signature_envelope", {
      p_contract_version_id: ids.contractVersion,
      p_amendment_version_id: null,
      p_idempotency_key: `${runId}-contract`,
      p_signers: [
        {
          name: "Cliente de Homologação",
          email: clientEmail,
          role: "CONTRATANTE",
          order: 1
        }
      ]
    }),
    "Repetir envelope idempotente"
  );

  const signers = await unwrap(
    admin.from("signature_signers").select("id").eq("envelope_id", ids.contractEnvelope),
    "Validar signatários"
  );
  assertEqual(signers.length, 1, "Signatário idempotente");

  for (const event of ["SENT", "VIEWED", "SIGNED", "COMPLETED"]) {
    await unwrap(
      admin.rpc("sandbox_signature_event", {
        p_envelope_id: ids.contractEnvelope,
        p_event_type: event,
        p_provider_event_id: `${runId}-contract-${event}`
      }),
      `Evento ${event}`
    );
  }

  await unwrap(
    admin.rpc("sandbox_signature_event", {
      p_envelope_id: ids.contractEnvelope,
      p_event_type: "COMPLETED",
      p_provider_event_id: `${runId}-contract-COMPLETED`
    }),
    "Repetir evento idempotente"
  );

  const events = await unwrap(
    admin.from("signature_events").select("id").eq("envelope_id", ids.contractEnvelope),
    "Validar eventos"
  );
  assertEqual(events.length, 4, "Eventos idempotentes");

  ids.amendment = await unwrap(
    admin.rpc("create_amendment", {
      p_contract_id: ids.contract,
      p_code: `ADT-${code}`,
      p_reason: "Acréscimo E2E",
      p_scope_delta: "Serviço adicional",
      p_value_delta: 1000,
      p_days_delta: 20,
      p_new_end_date: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
      p_budget_version_id: null
    }),
    "Criar aditivo"
  );

  const amendment = await unwrap(
    admin.from("amendments").select("current_version_id").eq("id", ids.amendment).single(),
    "Ler aditivo"
  );
  ids.amendmentVersion = amendment.current_version_id;

  await unwrap(
    admin
      .from("amendments")
      .update({ client_released_at: now, status: "SIGNATURE_PENDING" })
      .eq("id", ids.amendment),
    "Liberar aditivo"
  );

  await unwrap(
    admin
      .from("amendment_versions")
      .update({
        client_released_at: now,
        frozen_at: now,
        status: "SIGNATURE_PENDING",
        document_path: `${organizationId}/amendments/${runId}.pdf`,
        document_sha256: crypto.createHash("sha256").update(`amendment-${runId}`).digest("hex")
      })
      .eq("id", ids.amendmentVersion),
    "Liberar versão do aditivo"
  );

  ids.amendmentEnvelope = await unwrap(
    admin.rpc("create_sandbox_signature_envelope", {
      p_contract_version_id: null,
      p_amendment_version_id: ids.amendmentVersion,
      p_idempotency_key: `${runId}-amendment`,
      p_signers: [
        {
          name: "Cliente de Homologação",
          email: clientEmail,
          role: "CONTRATANTE",
          order: 1
        }
      ]
    }),
    "Criar envelope do aditivo"
  );

  for (const event of ["SENT", "COMPLETED"]) {
    await unwrap(
      admin.rpc("sandbox_signature_event", {
        p_envelope_id: ids.amendmentEnvelope,
        p_event_type: event,
        p_provider_event_id: `${runId}-amendment-${event}`
      }),
      `Evento do aditivo ${event}`
    );
  }

  await unwrap(
    admin.from("amendments").update({ status: "SIGNED" }).eq("id", ids.amendment),
    "Marcar aditivo assinado"
  );
  await unwrap(
    service.rpc("apply_signed_amendment", { p_amendment_id: ids.amendment }),
    "Aplicar aditivo"
  );

  const consolidated = await unwrap(
    service
      .from("contracts")
      .select("original_value,amendment_value,consolidated_value,status")
      .eq("id", ids.contract)
      .single(),
    "Validar contrato consolidado"
  );
  assertEqual(Number(consolidated.original_value), 9062.5, "Valor original");
  assertEqual(Number(consolidated.amendment_value), 1000, "Valor do aditivo");
  assertEqual(Number(consolidated.consolidated_value), 10062.5, "Valor consolidado");
  assertEqual(consolidated.status, "AMENDED", "Status consolidado");

  const auditQuery = await service
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("resource_id", [
      ids.budget,
      ids.budgetVersion,
      ids.approval,
      ids.proposalVersion,
      ids.contract,
      ids.contractEnvelope,
      ids.amendment,
      ids.amendmentEnvelope
    ]);
  if (auditQuery.error) fail("Contar auditorias", auditQuery.error);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        financial: {
          directCost: 5500,
          salePrice: 9062.5,
          estimatedProfit: 1812.5,
          roi: 0.18125
        },
        security: {
          clientBudgetHidden: true,
          aal1Blocked: true,
          aal2Verified: true
        },
        workflow: {
          proposalAccepted: true,
          contractCompleted: true,
          signerIdempotency: true,
          eventIdempotency: true,
          amendmentApplied: true
        },
        auditEvents: auditQuery.count ?? null
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await cleanup();
  await admin.auth.signOut().catch(() => undefined);
  await client.auth.signOut().catch(() => undefined);
}
