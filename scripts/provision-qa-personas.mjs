import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "QA_PERSONAS_JSON"
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
}

if (process.env.ALLOW_INSECURE_DEMO_USERS !== "true") {
  throw new Error("Defina ALLOW_INSECURE_DEMO_USERS=true somente no ambiente isolado de homologação.");
}

let personas;
try {
  personas = JSON.parse(process.env.QA_PERSONAS_JSON);
} catch {
  throw new Error("QA_PERSONAS_JSON não é JSON válido.");
}

const definitions = [
  {
    key: "administrador",
    role: "ADMINISTRADOR",
    profileCode: "administrador",
    fullName: "Administrador QA"
  },
  {
    key: "gestor_de_obras",
    role: "GESTOR_OBRAS",
    profileCode: "gestor_obras",
    fullName: "Gestor de Obras QA"
  }
];

for (const definition of definitions) {
  const credential = personas?.[definition.key];
  if (!credential?.email || !credential?.password) {
    throw new Error(`Credencial ausente para a persona ${definition.key}.`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function findUserByEmail(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Não foi possível concluir a busca de usuários de homologação.");
}

async function ensureUser(email, password, fullName, persona) {
  const existing = await findUserByEmail(email);
  const attributes = {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existing?.user_metadata ?? {}),
      full_name: fullName,
      environment: "homologation",
      qa_persona: persona
    }
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, attributes);
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({ email, ...attributes });
  if (error) throw error;
  return data.user;
}

async function resolveOrganizationId() {
  if (process.env.QA_ORGANIZATION_ID) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", process.env.QA_ORGANIZATION_ID)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("QA_ORGANIZATION_ID não existe no banco de homologação.");
    return data.id;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("trade_name", "Innovar")
    .limit(2);
  if (error) throw error;
  if (data.length !== 1) {
    throw new Error("Defina QA_ORGANIZATION_ID: não foi possível identificar uma única organização Innovar.");
  }
  return data[0].id;
}

const organizationId = await resolveOrganizationId();
const { data: profileRows, error: profileLookupError } = await supabase
  .from("access_profiles")
  .select("id,code")
  .eq("organization_id", organizationId)
  .eq("active", true)
  .in("code", definitions.map((item) => item.profileCode));
if (profileLookupError) throw profileLookupError;

const accessProfiles = new Map(profileRows.map((profile) => [profile.code, profile.id]));
const provisioned = [];

for (const definition of definitions) {
  const credential = personas[definition.key];
  const accessProfileId = accessProfiles.get(definition.profileCode);
  if (!accessProfileId) {
    throw new Error(`Perfil de acesso ${definition.profileCode} não existe na organização de homologação.`);
  }

  const user = await ensureUser(
    credential.email,
    credential.password,
    definition.fullName,
    definition.key
  );

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: definition.fullName,
    email: credential.email,
    must_change_password: false
  });
  if (profileError) throw profileError;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: definition.role,
        active: true,
        access_profile_id: accessProfileId
      },
      { onConflict: "organization_id,user_id" }
    )
    .select("id,role,access_profile_id")
    .single();
  if (membershipError) throw membershipError;

  provisioned.push({
    persona: definition.key,
    userId: user.id,
    membershipId: membership.id,
    role: membership.role,
    accessProfileId: membership.access_profile_id
  });
}

console.log(JSON.stringify({ ok: true, organizationId, provisioned }, null, 2));
