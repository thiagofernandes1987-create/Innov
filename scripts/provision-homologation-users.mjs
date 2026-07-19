import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_CLIENT_PASSWORD"
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
}

if (process.env.ALLOW_INSECURE_DEMO_USERS !== "true") {
  throw new Error("Defina ALLOW_INSECURE_DEMO_USERS=true somente no ambiente isolado de homologação.");
}

const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@innov.eng.br";
const clientEmail = process.env.DEMO_CLIENT_EMAIL ?? "cliente@cliente.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ensureUser(email, password, fullName) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const existing = listed.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...existing.user_metadata,
        full_name: fullName,
        environment: "homologation"
      }
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, environment: "homologation" }
  });
  if (error) throw error;
  return data.user;
}

async function ensureOrganization(adminUserId) {
  const { data: existing, error: findError } = await supabase
    .from("organizations")
    .select("id")
    .eq("trade_name", "Innovar")
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("organizations")
    .insert({
      legal_name: "Innovar Construções e Reformas",
      trade_name: "Innovar",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      created_by: adminUserId
    })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

async function ensureClient(organizationId, adminUserId, clientUserId) {
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", clientUserId)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    organization_id: organizationId,
    user_id: clientUserId,
    type: "PERSON",
    legal_name: "Cliente de Homologação",
    trade_name: "Cliente Teste",
    email: clientEmail,
    created_by: adminUserId
  };

  if (existing) {
    const { error } = await supabase.from("clients").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data: created, error } = await supabase.from("clients").insert(payload).select("id").single();
  if (error) throw error;
  return created.id;
}

const adminUser = await ensureUser(adminEmail, process.env.DEMO_ADMIN_PASSWORD, "Administrador Innovar");
const clientUser = await ensureUser(clientEmail, process.env.DEMO_CLIENT_PASSWORD, "Cliente de Homologação");
const organizationId = await ensureOrganization(adminUser.id);

const { error: profileError } = await supabase.from("profiles").upsert([
  { id: adminUser.id, full_name: "Administrador Innovar", email: adminEmail, must_change_password: true },
  { id: clientUser.id, full_name: "Cliente de Homologação", email: clientEmail, must_change_password: true }
]);
if (profileError) throw profileError;

const { error: membershipError } = await supabase.from("organization_memberships").upsert(
  { organization_id: organizationId, user_id: adminUser.id, role: "SUPER_ADMIN", active: true },
  { onConflict: "organization_id,user_id" }
);
if (membershipError) throw membershipError;

const clientId = await ensureClient(organizationId, adminUser.id, clientUser.id);

console.log(JSON.stringify({
  ok: true,
  organizationId,
  clientId,
  adminUserId: adminUser.id,
  clientUserId: clientUser.id,
  warning: "Altere as senhas temporárias depois do primeiro acesso."
}, null, 2));