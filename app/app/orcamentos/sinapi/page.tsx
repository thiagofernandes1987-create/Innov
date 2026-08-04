import Link from "next/link";
import { addSinapiBudgetItem, updateSinapiAutomatically } from "@/app/actions/sinapi";
import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";

export const maxDuration = 300;

 type SinapiPageProps = {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    region?: string;
    relief?: string;
    baseDate?: string;
    error?: string;
    success?: string;
  }>;
};

type SinapiReference = {
  kind: "INPUT" | "COMPOSITION";
  reference_id: string;
  code: string;
  description: string;
  unit: string;
  unit_cost: number | string;
  region: string;
  base_date: string;
  tax_relief: boolean;
  source_url: string;
  component_count: number | string;
};

type SinapiBatch = {
  id: string;
  region: string;
  base_date: string;
  tax_relief: boolean;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "SUPERSEDED";
  imported_inputs: number | string;
  imported_compositions: number | string;
  rejected_records: number | string;
  source_url: string;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

const ufs = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];
const automaticUpdateRoles = new Set(["SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "2-digit", year: "numeric" })
    .format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function batchStatus(status: SinapiBatch["status"]) {
  if (status === "COMPLETED") return "Concluído";
  if (status === "RUNNING") return "Em processamento";
  if (status === "FAILED") return "Falhou";
  return "Substituído";
}

export default async function SinapiCatalogPage({ searchParams }: SinapiPageProps) {
  const query = await searchParams;
  const { supabase, organizationId, role } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"
  ]);

  const region = ufs.includes(String(query.region ?? "SP").toUpperCase())
    ? String(query.region ?? "SP").toUpperCase()
    : "SP";
  const taxRelief = query.relief === "true";
  const kind = ["ALL", "INPUT", "COMPOSITION"].includes(String(query.kind ?? "ALL").toUpperCase())
    ? String(query.kind ?? "ALL").toUpperCase()
    : "ALL";
  const search = String(query.q ?? "").trim();

  const [{ data: budgets }, { data: batchRows }] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, code, title, current_version_id")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("sinapi_import_batches")
      .select("id, region, base_date, tax_relief, status, imported_inputs, imported_compositions, rejected_records, source_url, error_message, started_at, finished_at")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
  ]);

  const batches = (batchRows ?? []) as SinapiBatch[];
  const completedBatches = batches.filter(batch => batch.status === "COMPLETED");
  const currentVersionIds = (budgets ?? [])
    .map(budget => budget.current_version_id)
    .filter((value): value is string => Boolean(value));
  const { data: versions } = currentVersionIds.length
    ? await supabase
        .from("budget_versions")
        .select("id, budget_id, version_number, frozen_at")
        .in("id", currentVersionIds)
    : { data: [] };

  const editableVersions = (versions ?? [])
    .filter(version => !version.frozen_at)
    .map(version => {
      const budget = (budgets ?? []).find(item => item.id === version.budget_id);
      return {
        id: version.id,
        label: `${budget?.code ?? "ORÇ"} · V${version.version_number} · ${budget?.title ?? "Orçamento"}`
      };
    });

  const availableBatches = completedBatches.filter(
    batch => batch.region === region && Boolean(batch.tax_relief) === taxRelief
  );
  const selectedBaseDate = query.baseDate && /^\d{4}-\d{2}-01$/.test(query.baseDate)
    ? query.baseDate
    : availableBatches[0]?.base_date ?? null;

  const { data: references, error: searchError } = selectedBaseDate
    ? await supabase.rpc("search_sinapi_references", {
        p_organization_id: organizationId,
        p_query: search || null,
        p_kind: kind,
        p_region: region,
        p_base_date: selectedBaseDate,
        p_tax_relief: taxRelief,
        p_limit: 50
      })
    : { data: [], error: null };

  const rows = (references ?? []) as SinapiReference[];
  const currentBatch = availableBatches.find(batch => batch.base_date === selectedBaseDate);
  const latestAttempt = batches.find(batch => batch.region === region && Boolean(batch.tax_relief) === taxRelief);
  const canUpdate = automaticUpdateRoles.has(role);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">CAIXA + IBGE</span>
          <h1>Catálogo SINAPI</h1>
          <p className="muted">Insumos e composições mensais com UF, data-base e regime de desoneração preservados.</p>
        </div>
        {canUpdate ? (
          <form action={updateSinapiAutomatically}>
            <input type="hidden" name="region" value={region} />
            <input type="hidden" name="taxRelief" value={String(taxRelief)} />
            <button className="button button-primary" type="submit">
              Atualizar SINAPI automaticamente
            </button>
          </form>
        ) : null}
      </div>

      {query.success ? <div className="validation success" role="status">{query.success}</div> : null}
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      {searchError ? <div className="validation blocking" role="alert">{searchError.message}</div> : null}

      <section className="card card-pad">
        <form method="get" className="grid">
          {/* Era `minmax(220px,2fr) repeat(4,minmax(130px,1fr))`: 740px de
              largura mínima, medidos, que faziam a página inteira rolar de
              lado em 390px. É a VACINA-044 na trilha explícita — pista que não
              encolhe abaixo do conteúdo. */}
          <div className="grid sinapi-filtros">
            <label>
              Código ou descrição
              <input name="q" defaultValue={search} placeholder="Ex.: alvenaria, cimento ou 88264" />
            </label>
            <label>
              Tipo
              <select name="kind" defaultValue={kind}>
                <option value="ALL">Todos</option>
                <option value="COMPOSITION">Composições</option>
                <option value="INPUT">Insumos</option>
              </select>
            </label>
            <label>
              UF
              <select name="region" defaultValue={region}>
                {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </label>
            <label>
              Regime
              <select name="relief" defaultValue={String(taxRelief)}>
                <option value="false">Sem desoneração</option>
                <option value="true">Com desoneração</option>
              </select>
            </label>
            <label>
              Data-base
              <select name="baseDate" defaultValue={selectedBaseDate ?? ""} disabled={!availableBatches.length}>
                {!availableBatches.length ? <option value="">Sem base importada</option> : null}
                {availableBatches.map(batch => (
                  <option key={batch.id} value={batch.base_date}>{formatDate(batch.base_date)}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="button button-primary" type="submit">Consultar SINAPI</button>
        </form>
      </section>

      {latestAttempt ? (
        <section className="card card-pad" style={{ marginTop: 18 }} aria-label="Última atualização SINAPI">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <span className="badge">{batchStatus(latestAttempt.status)}</span>
              <h2 style={{ marginBottom: 4 }}>Última atualização de {region}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {formatDate(latestAttempt.base_date)} · {taxRelief ? "com" : "sem"} desoneração · iniciada em {formatDateTime(latestAttempt.started_at)}
              </p>
            </div>
            <div className="mono">
              {Number(latestAttempt.imported_inputs).toLocaleString("pt-BR")} insumos · {Number(latestAttempt.imported_compositions).toLocaleString("pt-BR")} composições
            </div>
          </div>
          {latestAttempt.error_message ? (
            <div className="validation blocking" style={{ marginTop: 14 }}>{latestAttempt.error_message}</div>
          ) : null}
        </section>
      ) : null}

      {currentBatch ? (
        <section className="grid grid-kpi" aria-label="Estado da base SINAPI" style={{ marginTop: 18 }}>
          <article className="card kpi"><small>DATA-BASE</small><strong>{formatDate(currentBatch.base_date)}</strong></article>
          <article className="card kpi"><small>INSUMOS</small><strong>{Number(currentBatch.imported_inputs).toLocaleString("pt-BR")}</strong></article>
          <article className="card kpi"><small>COMPOSIÇÕES</small><strong>{Number(currentBatch.imported_compositions).toLocaleString("pt-BR")}</strong></article>
          <article className="card kpi"><small>REGIME</small><strong>{taxRelief ? "Desonerado" : "Não desonerado"}</strong></article>
        </section>
      ) : (
        <div className="validation blocking" style={{ marginTop: 18 }}>
          Nenhum lote oficial SINAPI foi importado para {region} neste regime. O catálogo não apresenta dados fictícios.
        </div>
      )}

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card-pad">
          <h2>Referências encontradas</h2>
          <p className="muted">
            Ao adicionar, o preço é copiado para a versão escolhida. Atualizações mensais futuras não alteram o orçamento histórico.
          </p>
          {!editableVersions.length ? (
            <div className="validation blocking">Não há versão editável. Crie uma nova versão no orçamento congelado.</div>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th><th>Código e descrição</th><th>Un.</th><th>Custo unit.</th>
                <th>Componentes</th><th>Adicionar ao orçamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(reference => (
                <tr key={`${reference.kind}:${reference.reference_id}`}>
                  <td><span className="badge">{reference.kind === "COMPOSITION" ? "Composição" : "Insumo"}</span></td>
                  <td>
                    <strong className="mono">{reference.code}</strong><br />
                    <span>{reference.description}</span><br />
                    <small className="muted">{reference.region} · {formatDate(reference.base_date)} · {reference.tax_relief ? "com" : "sem"} desoneração</small>
                  </td>
                  <td>{reference.unit}</td>
                  <td className="mono">{formatCurrency(Number(reference.unit_cost))}</td>
                  <td className="mono">
                    {reference.kind === "COMPOSITION" ? (
                      // Um clique da lista para a memória de cálculo (T-37.10).
                      // A contagem já era o número que o orçamentista olhava
                      // para decidir se valia abrir; só faltava poder abrir.
                      <Link className="link-de-celula" href={`/app/orcamentos/sinapi/composicao/${reference.reference_id}`}>
                        {Number(reference.component_count).toLocaleString("pt-BR")} itens
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <form action={addSinapiBudgetItem} className="grid" style={{ minWidth: 260 }}>
                      <input type="hidden" name="kind" value={reference.kind} />
                      <input type="hidden" name="referenceId" value={reference.reference_id} />
                      <select name="versionId" required defaultValue="" disabled={!editableVersions.length}>
                        <option value="" disabled>Escolha o orçamento</option>
                        {editableVersions.map(version => <option key={version.id} value={version.id}>{version.label}</option>)}
                      </select>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input name="quantity" type="number" min="0.000001" step="0.000001" defaultValue="1" required style={{ maxWidth: 110 }} />
                        <button className="button button-primary" type="submit" disabled={!editableVersions.length}>Adicionar</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr><td colSpan={6}><div className="card-pad"><strong>Nenhuma referência disponível.</strong><p className="muted">Ajuste os filtros ou importe o lote oficial correspondente.</p></div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
