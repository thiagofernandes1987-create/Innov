import { selectActiveOrganization } from "@/app/actions/organization-context";
import { requireUser } from "@/lib/auth";
import { safeInternalReturnPath } from "@/lib/organization-context";

type PageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SelectOrganizationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = safeInternalReturnPath(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo);
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, organizations(legal_name, trade_name)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error || !data?.length) {
    return <main><h1>Nenhuma organização disponível</h1></main>;
  }

  return (
    <main>
      <h1>Selecione a organização</h1>
      <p>Escolha explicitamente o contexto desta sessão.</p>
      <div>
        {data.map(row => {
          const organization = Array.isArray(row.organizations)
            ? row.organizations[0]
            : row.organizations as { legal_name?: string; trade_name?: string } | null;
          return (
            <form action={selectActiveOrganization} key={row.organization_id}>
              <input type="hidden" name="organizationId" value={row.organization_id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit">
                {organization?.trade_name || organization?.legal_name || row.organization_id} — {row.role}
              </button>
            </form>
          );
        })}
      </div>
    </main>
  );
}
