// Nome de pessoa a partir do id de usuário.
//
// **Não existe relação de PostgREST entre `project_memberships` e `profiles`.**
// A coluna `user_id` aponta para `auth.users`, e `auth` não faz parte do
// esquema exposto; escrever `profiles(full_name)` no `select` devolve PGRST200
// — relação inexistente — e derruba a consulta inteira, não só o nome.
//
// Por isso o nome vem numa segunda leitura, por `in(id, …)`. É como as telas de
// planejamento, administração e do pipeline já resolvem pessoa; este arquivo só
// dá um nome ao padrão para que a próxima tela não volte a tentar o embed.

type Cliente = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

/**
 * Mapa `user_id → nome`, já sem repetição e sem ids vazios.
 *
 * Falha em silêncio de propósito: o chamador tem fallback — o começo do id — e
 * derrubar a tela de tarefas porque um nome não veio seria trocar o essencial
 * pelo acessório. A falha de leitura, quando houver, já é reportada pelo
 * `reportDataAccessError` da própria tela para as consultas que importam.
 */
export async function nomesDosUsuarios(
  supabase: Cliente,
  ids: readonly (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unicos.length === 0) return new Map();

  const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", unicos);
  const mapa = new Map<string, string>();
  for (const linha of data ?? []) {
    const nome = String(linha.full_name ?? "").trim() || String(linha.email ?? "").trim();
    if (nome) mapa.set(String(linha.id), nome);
  }
  return mapa;
}
