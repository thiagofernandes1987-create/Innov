import{mensagemDeFalha}from"@/lib/errors/data-access";
import Link from "next/link";
import { requireCapability } from "@/lib/authorization";
import { formatMoney } from "@/lib/financial/cash-flow";

export const dynamic = "force-dynamic";

export default async function RhAdmissionsPage() {
  const context = await requireCapability("rh", "read");
  const { data, error } = await context.supabase
    .from("rh_admission_cases")
    .select("id,case_number,status,full_name,preferred_name,worker_code,registration_number,employment_type,admission_date,base_salary,esocial_strategy,rh_employers(code,legal_name),rh_establishments(code,name)")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(mensagemDeFalha("app.rh.admissoes.RhAdmissionsPage", error));

  return (
    <main className="content">
      <section className="page-heading">
        <div><span className="badge">RH · ADMISSÕES</span><h1>Fila de admissões</h1><p>Casos preparados e conferidos antes da ativação do vínculo.</p></div>
        <div className="page-actions"><Link className="button button-primary" href="/app/rh/admissoes/nova">Nova admissão</Link></div>
      </section>
      <section className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead><tr><th>Caso</th><th>Trabalhador</th><th>Admissão</th><th>Empresa</th><th>Salário</th><th>eSocial</th><th>Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((item) => {
              const employer = Array.isArray(item.rh_employers) ? item.rh_employers[0] : item.rh_employers;
              return <tr key={item.id}>
                <td><Link className="text-link" href={`/app/rh/admissoes/${item.id}`}><strong>{item.case_number}</strong></Link></td>
                <td>{item.preferred_name || item.full_name}<small style={{ display: "block" }}>{item.registration_number} · {item.employment_type}</small></td>
                <td>{item.admission_date}</td>
                <td>{employer ? `${employer.code} · ${employer.legal_name}` : "—"}</td>
                <td>{formatMoney(Number(item.base_salary))}</td>
                <td>
                  <strong>{item.esocial_strategy}</strong>
                  <small style={{ display: "block" }}>
                    <Link className="text-link" href={`/app/rh/admissoes/${item.id}/esocial-especial`}>Aprendiz/temporário/imigrante</Link>
                    {" · "}
                    <Link className="text-link" href={`/app/rh/admissoes/${item.id}/esocial-transicao`}>Transferência/CPF</Link>
                  </small>
                </td>
                <td><span className="badge">{item.status}</span></td>
              </tr>;
            })}
            {!data?.length ? <tr><td colSpan={7}><div className="empty-state"><h3>Nenhuma admissão</h3><p>Crie o primeiro caso de admissão.</p></div></td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
