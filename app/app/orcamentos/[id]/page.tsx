import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCubReferenceItem,
  addManualBudgetItem,
  calculateBudgetVersion,
  decideBudgetApproval,
  freezeBudgetVersion,
  removeBudgetItem,
  updateBudgetPricing
} from "@/app/actions/budgets";
import {
  TIPOLOGIAS_CUB,
  familiaDaTipologia,
  type FamiliaDeCub
} from "@/lib/cost-sources/cub-serie-historica";
import { UFS_DO_BRASIL, referenciasDaUf, ufDaReferencia } from "@/lib/orcamentos/cub-por-uf";
import { singleRelation } from "@/lib/supabase/relations";
import { requireOrganizationContext } from "@/lib/auth";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import { budgetStatusLabels, formatCurrency, formatPercent, type BudgetStatus } from "@/lib/domain";
import { padroesDoEscopo } from "@/lib/sugestoes/escopos";
import { totaisPorNatureza } from "@/lib/orcamentos/naturezas";
import { ESCOPOS, sugestoesDoEscopo } from "@/lib/sugestoes/servidor";


const ORDEM_DE_FAMILIA: readonly FamiliaDeCub[] = ["RESIDENCIAL", "COMERCIAL", "ESPECIAL"];
const ROTULO_DE_FAMILIA: Record<FamiliaDeCub, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  ESPECIAL: "Especiais"
};

/** O que a sigla quer dizer, para quem não decorou a NBR 12721. */
function descricaoDaTipologia(codigo: string) {
  return TIPOLOGIAS_CUB.find(item => item.codigo === codigo)?.descricao ?? "Referência oficial";
}

type BudgetDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; aviso?: string; uf?: string }>;
};

type CostReferenceSnapshot = {
  id: string;
  source_name: string;
  region: string;
  reference_code: string;
  base_date: string;
  publication_date: string | null;
  tax_relief: boolean;
  unit: string;
  total_cost: number | string;
  materials_cost: number | string | null;
  labor_cost: number | string | null;
  administrative_cost: number | string | null;
  source_url: string;
  raw_payload: Record<string, unknown> | null;
};

/**
 * Uma declaração manual não pode chegar com a mesma cara de uma leitura
 * conferida (T-37.13b). O servidor baixou e conferiu o arquivo do SindusCon-SP;
 * no CUB de outro estado, alguém digitou o número de um PDF. As duas entram no
 * mesmo catálogo oficial, e quem escolhe merece saber qual é qual.
 */
function declaradaAMao(snapshot: CostReferenceSnapshot) {
  return (snapshot.raw_payload as { retrievalMode?: string } | null)?.retrievalMode === "declaracao-manual";
}

const categoryLabels: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Mão de obra",
  EQUIPMENT: "Equipamento",
  SERVICE: "Serviço",
  SUBCONTRACT: "Subempreita",
  FIXED_COST: "Custo fixo",
  REFERENCE: "Referência global",
  OTHER: "Outro"
};

const costTypeLabels: Record<string, string> = {
  DIRECT: "Direto",
  INDIRECT: "Indireto",
  FIXED: "Fixo",
  ADMINISTRATIVE: "Administrativo"
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function asPercent(value: unknown) {
  return Number(value ?? 0) * 100;
}

export default async function BudgetDetailPage({ params, searchParams }: BudgetDetailProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, code, title, status, valid_until, client_id, project_id, current_version_id, clients(legal_name), projects(state, city)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!budget || !budget.current_version_id) notFound();

  // "m2", "M²" e "m ²" viram três unidades no mesmo orçamento, e o total por
  // unidade deixa de fechar. É o campo em que a divergência de grafia custa
  // mais caro, e o que a empresa usa vem antes do padrão da plataforma.
  const sugestoesDeUnidade = await sugestoesDoEscopo(supabase, organizationId, ESCOPOS.unidade, {
    padroes: padroesDoEscopo(ESCOPOS.unidade)
  });

  const { data: version } = await supabase
    .from("budget_versions")
    .select("*")
    .eq("id", budget.current_version_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!version) notFound();

  const [
    { data: items },
    { data: validations },
    { data: approvals },
    { data: referenceSnapshots },
    { data: markupModel }
  ] = await Promise.all([
    supabase
      .from("budget_items")
      .select("id, code, description, unit, quantity, unit_cost, loss_rate, freight_rate, cost_type, item_category, source, region, base_date")
      .eq("budget_version_id", version.id)
      .order("sequence"),
    supabase
      .from("budget_validation_results")
      .select("id, code, severity, message, field_name, resolved_at")
      .eq("budget_version_id", version.id)
      .order("created_at"),
    supabase
      .from("budget_approvals")
      .select("id, approval_type, status, requested_by, approver_id, requires_aal2, reason, created_at")
      .eq("budget_version_id", version.id)
      .order("created_at"),
    supabase
      .from("cost_reference_snapshots")
      .select("id, source_name, region, reference_code, base_date, publication_date, tax_relief, unit, total_cost, materials_cost, labor_cost, administrative_cost, source_url, raw_payload")
      // Sem `.eq("source_key", …)`: esta tabela é só de CUB, e fixar a chave de
      // São Paulo era o que fazia a obra em Minas receber o preço paulista sem
      // aviso. O recorte por UF é feito depois, em `referenciasDaUf`.
      .order("base_date", { ascending: false })
      .order("tax_relief", { ascending: true })
      .order("total_cost", { ascending: false }),
    supabase
      .from("markup_models")
      .select("id, method, tax_rate, commission_rate, variable_expense_rate, desired_margin_rate")
      .eq("id", version.markup_model_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle()
  ]);

  const baseCost = Number(version.direct_cost) + Number(version.indirect_cost) + Number(version.fixed_cost) + Number(version.administrative_fee);

  // T-37.6: o corte que decide equipe própria contra empreitada. O resumo ao
  // lado soma por tipo de custo, que é a conta do BDI; esta soma por natureza,
  // que é a conta da obra. A fórmula é a mesma do banco — ver
  // `lib/orcamentos/naturezas.ts`.
  const naturezas = totaisPorNatureza(items ?? []);
  const client = budget.clients as { legal_name?: string } | null;
  const frozen = Boolean(version.frozen_at);
  const snapshots = (referenceSnapshots ?? []) as CostReferenceSnapshot[];

  // T-37.13a: a UF da obra manda; o que a pessoa escolher na tela ganha dela.
  const obra = singleRelation(budget.projects as unknown);
  const ufDoCub = ufDaReferencia({
    ufDoProjeto: (obra as { state?: string } | null)?.state ?? null,
    ufPedida: query.uf ?? null
  });
  const snapshotsDaUf = referenciasDaUf(snapshots, ufDoCub);

  // T-37.4: as dezenove tipologias agrupadas pela família que a NBR 12721
  // define. A família sai do **código**, não do `raw_payload`: as duas linhas
  // semeadas antes desta tarefa não têm o campo, e derivar do código dá a mesma
  // resposta para todas sem depender de quando a linha entrou.
  const cubPorFamilia = (() => {
    const porFamilia = new Map<FamiliaDeCub, typeof snapshotsDaUf>();
    for (const snapshot of snapshotsDaUf) {
      const familia = familiaDaTipologia(String(snapshot.reference_code));
      porFamilia.set(familia, [...(porFamilia.get(familia) ?? []), snapshot]);
    }
    return ORDEM_DE_FAMILIA.filter(familia => porFamilia.has(familia)).map(
      familia => [familia, porFamilia.get(familia)!] as const
    );
  })();


  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">{budget.code} · V{version.version_number}</span>
          <h1>{budget.title}</h1>
          <p className="muted">
            {client?.legal_name ?? "Cliente não identificado"} · {budgetStatusLabels[budget.status as BudgetStatus] ?? budget.status}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <form action={calculateBudgetVersion}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <button className="button button-secondary" type="submit" disabled={frozen}>Recalcular</button>
          </form>
          <form action={freezeBudgetVersion}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <button className="button button-primary" type="submit" disabled={frozen}>Congelar e solicitar aprovação</button>
          </form>
        </div>
      </div>

      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      {query.aviso ? (
        <div className="validation" role="status">{query.aviso}</div>
      ) : null}
      {frozen ? (
        <div className="validation" role="status">
          Esta versão está congelada desde {new Date(version.frozen_at).toLocaleString("pt-BR")}. Crie uma nova versão para alterar custos ou margem.
        </div>
      ) : null}

      <div className="financial-grid">
        <div className="grid">
          <section className="card card-pad">
            <h2>Adicionar custos ao orçamento</h2>
            <p className="muted">
              Escolha uma referência global por metragem ou cadastre material, mão de obra, equipamento, serviço e custos fixos individualmente.
            </p>

            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", alignItems: "start" }}>
              <article className="card card-pad">
                <span className="badge">REFERÊNCIA OFICIAL</span>
                <h3>CUB por m² · {ufDoCub}</h3>
                <p className="muted">
                  Use como referência global de coerência. Para orçamento executivo, complemente com composições e cotações.
                </p>
                {/* T-37.13a: trocar de UF é `GET`, não ação — a pessoa está
                    consultando, e a URL passa a carregar o estado escolhido. */}
                <form method="get" className="cub-seletor-uf">
                  <label>
                    Estado da referência
                    <select name="uf" defaultValue={ufDoCub}>
                      {UFS_DO_BRASIL.map(sigla => (
                        <option key={sigla} value={sigla}>
                          {sigla}
                          {(obra as { state?: string } | null)?.state?.trim().toUpperCase() === sigla
                            ? " · UF da obra"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button button-secondary" type="submit">Ver CUB deste estado</button>
                </form>
                <form action={addCubReferenceItem} className="grid">
                  <input type="hidden" name="budgetId" value={budget.id} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <label>
                    Referência e data-base
                    {/* Agrupado por família porque são dezenove tipologias da NBR
                        12721 (T-37.4), e uma lista plana de vinte e uma linhas
                        obriga a decorar sigla. A descrição vem junto: quem orça
                        reconhece "R8-N", raramente "CSL-16A". */}
                    <select name="snapshotId" required defaultValue="" disabled={frozen}>
                      <option value="" disabled>Selecione o CUB</option>
                      {cubPorFamilia.map(([familia, itens]) => (
                        <optgroup key={familia} label={ROTULO_DE_FAMILIA[familia]}>
                          {itens.map((snapshot) => (
                            <option key={snapshot.id} value={snapshot.id}>
                              {snapshot.reference_code} · {descricaoDaTipologia(snapshot.reference_code)} · {snapshot.tax_relief ? "com" : "sem"} desoneração · {formatDate(snapshot.base_date)} · {formatCurrency(Number(snapshot.total_cost))}/{snapshot.unit}{declaradaAMao(snapshot) ? " · declarado à mão" : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label>
                    Metragem da obra
                    <input name="area" type="number" min="0.01" step="0.01" placeholder="100,00" required disabled={frozen} />
                  </label>
                  <button className="button button-primary" type="submit" disabled={frozen || snapshotsDaUf.length === 0}>
                    Aplicar CUB à metragem
                  </button>
                </form>
                {snapshotsDaUf[0] ? (
                  <p className="muted" style={{ marginTop: 12 }}>
                    Última publicação carregada: {formatDate(snapshotsDaUf[0].publication_date)}. Fonte: {snapshotsDaUf[0].source_name}
                    {snapshotsDaUf.some(declaradaAMao) ? ", com referências declaradas à mão nesta lista" : ""}.{" "}
                    <Link href={`/app/orcamentos/cub/importar?uf=${ufDoCub}&voltar=${budget.id}`}>
                      Registrar outra publicação
                    </Link>
                  </p>
                ) : (
                  // "Este estado não tem" é diferente de "não há nenhum", e a
                  // diferença decide o que a pessoa faz a seguir: importar o CUB
                  // daquele Sinduscon, ou conferir a UF que ela escolheu.
                  <div className="validation" role="status">
                    <strong>Sem CUB importado para {ufDoCub}.</strong>
                    <div>
                      A referência é publicada por cada Sinduscon estadual, e a de {ufDoCub} ainda não foi carregada.
                      {snapshots.length
                        ? ` Há referência para ${[...new Set(snapshots.map(item => String(item.region).trim().toUpperCase()))].sort().join(", ")}.`
                        : " Nenhum estado tem referência carregada ainda."}
                    </div>
                    {/* T-37.13b: dizer o que falta sem oferecer o caminho deixa
                        uma saída só — trocar a UF para SP e usar o número de
                        outro estado de propósito. Um clique daqui até o
                        formulário, com a UF já escolhida e o caminho de volta. */}
                    <div style={{ marginTop: 10 }}>
                      <Link
                        className="button button-secondary"
                        href={`/app/orcamentos/cub/importar?uf=${ufDoCub}&voltar=${budget.id}`}
                      >
                        Importar o CUB de {ufDoCub}
                      </Link>
                    </div>
                  </div>
                )}
              </article>

              <article className="card card-pad">
                <span className="badge">COMPOSIÇÃO MANUAL</span>
                <h3>Material, mão de obra ou serviço</h3>
                <form action={addManualBudgetItem} className="grid">
                  <input type="hidden" name="budgetId" value={budget.id} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
                    <label>
                      Natureza
                      <select name="itemCategory" defaultValue="MATERIAL" disabled={frozen}>
                        <option value="MATERIAL">Material</option>
                        <option value="LABOR">Mão de obra</option>
                        <option value="EQUIPMENT">Equipamento</option>
                        <option value="SERVICE">Serviço</option>
                        <option value="SUBCONTRACT">Subempreita</option>
                        <option value="FIXED_COST">Custo fixo</option>
                        <option value="OTHER">Outro</option>
                      </select>
                    </label>
                    <label>
                      Classificação contábil
                      <select name="costType" defaultValue="DIRECT" disabled={frozen}>
                        <option value="DIRECT">Custo direto</option>
                        <option value="INDIRECT">Custo indireto</option>
                        <option value="FIXED">Custo fixo</option>
                        <option value="ADMINISTRATIVE">Administrativo</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "160px minmax(0,1fr)" }}>
                    <label>Código<input name="code" placeholder="MAT-001" disabled={frozen} /></label>
                    <label>Descrição<input name="description" placeholder="Cimento CP II 50 kg" required disabled={frozen} /></label>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
                    <label>Unidade
                      <CampoComSugestao name="unit" sugestoes={sugestoesDeUnidade} placeholder="m², h, un, mês" required />
                    </label>
                    <label>Quantidade/metragem<input name="quantity" type="number" min="0.000001" step="0.000001" required disabled={frozen} /></label>
                    <label>Custo unitário<input name="unitCost" type="number" min="0.0001" step="0.0001" required disabled={frozen} /></label>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
                    <label>Perda (%)<input name="lossRate" type="number" min="0" max="100" step="0.01" defaultValue="0" disabled={frozen} /></label>
                    <label>Frete (%)<input name="freightRate" type="number" min="0" max="100" step="0.01" defaultValue="0" disabled={frozen} /></label>
                    <label>Região<input name="region" defaultValue="SP" required disabled={frozen} /></label>
                    <label>Data-base<input name="baseDate" type="date" defaultValue={version.base_date} required disabled={frozen} /></label>
                  </div>
                  <label>
                    Fonte do custo
                    <input name="source" placeholder="Cotação fornecedor, SINAPI, TCPO, contrato ou pesquisa" required disabled={frozen} />
                  </label>
                  <button className="button button-primary" type="submit" disabled={frozen}>Adicionar item e recalcular</button>
                </form>
              </article>
            </div>
          </section>

          <section className="card card-pad">
            <h2>Impostos, despesas e margem</h2>
            <p className="muted">
              Formação de preço pelo divisor: preço = custo-base ÷ (1 − impostos − comissão − despesas variáveis − margem desejada).
            </p>
            <form action={updateBudgetPricing} className="grid">
              <input type="hidden" name="budgetId" value={budget.id} />
              <input type="hidden" name="versionId" value={version.id} />
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                <label>
                  Impostos (%)
                  <input name="taxRate" type="number" min="0" max="99.99" step="0.01" defaultValue={asPercent(markupModel?.tax_rate)} disabled={frozen} />
                </label>
                <label>
                  Comissão (%)
                  <input name="commissionRate" type="number" min="0" max="99.99" step="0.01" defaultValue={asPercent(markupModel?.commission_rate)} disabled={frozen} />
                </label>
                <label>
                  Despesas variáveis (%)
                  <input name="variableExpenseRate" type="number" min="0" max="99.99" step="0.01" defaultValue={asPercent(markupModel?.variable_expense_rate)} disabled={frozen} />
                </label>
                <label>
                  Margem desejada (%)
                  <input name="desiredMarginRate" type="number" min="0" max="99.99" step="0.01" defaultValue={asPercent(markupModel?.desired_margin_rate)} disabled={frozen} />
                </label>
                <label>
                  Capital investido
                  <input name="investedCapital" type="number" min="0" step="0.01" defaultValue={Number(version.invested_capital ?? 0)} disabled={frozen} />
                </label>
              </div>
              <div className="validation">
                Para reduzir a margem, informe um percentual menor e salve. A soma dos quatro percentuais precisa permanecer abaixo de 100%.
              </div>
              <button className="button button-primary" type="submit" disabled={frozen}>Salvar formação de preço e recalcular</button>
            </form>
          </section>

          <section className="card">
            <div className="card-pad">
              <h2>Estrutura de custos</h2>
              <p className="muted">Itens que formam a versão atual. Custo fixo pode ser cadastrado por mês, verba, unidade ou período.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th><th>Natureza</th><th>Tipo</th><th>Un.</th><th>Qtd.</th><th>Custo unit.</th><th>Subtotal</th><th>Fonte</th><th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item) => {
                    const subtotal = Number(item.quantity) * Number(item.unit_cost) * (1 + Number(item.loss_rate) + Number(item.freight_rate));
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.code ?? "—"}</strong><br /><span className="muted">{item.description}</span></td>
                        <td>{categoryLabels[item.item_category] ?? item.item_category}</td>
                        <td><span className="badge">{costTypeLabels[item.cost_type] ?? item.cost_type}</span></td>
                        <td>{item.unit}</td>
                        <td className="mono">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                        <td className="mono">{formatCurrency(Number(item.unit_cost))}</td>
                        <td className="mono">{formatCurrency(subtotal)}</td>
                        <td><span>{item.source ?? "—"}</span><br /><small className="muted">{item.region ?? "—"} · {formatDate(item.base_date)}</small></td>
                        <td>
                          <form action={removeBudgetItem}>
                            <input type="hidden" name="budgetId" value={budget.id} />
                            <input type="hidden" name="versionId" value={version.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <button className="button button-secondary" type="submit" disabled={frozen}>Remover</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                  {!items?.length ? <tr><td colSpan={9}>Nenhum item cadastrado. Use CUB por metragem ou a composição manual acima.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <h2>Validações</h2>
            <p className="muted">Orçamento vazio, sem fonte, sem data-base, desatualizado ou sem recálculo não pode seguir para aprovação.</p>
            {(validations ?? []).map((validation) => (
              <div key={validation.id} className={`validation ${validation.severity === "BLOCKING" ? "blocking" : ""}`}>
                <strong>{validation.code}</strong> · {validation.message}
                {validation.resolved_at ? <span className="badge badge-success" style={{ marginLeft: 8 }}>Resolvido</span> : null}
              </div>
            ))}
            {!validations?.length ? <div className="validation">Nenhuma inconsistência registrada. Execute o cálculo para atualizar as regras.</div> : null}
          </section>

          <section className="card card-pad">
            <h2>Aprovações e alçadas</h2>
            <p className="muted">O solicitante não pode decidir a própria aprovação. Justificativa é obrigatória.</p>
            <div className="grid">
              {(approvals ?? []).map((approval) => (
                <article key={approval.id} className="card card-pad">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <strong>{approval.approval_type}</strong>
                      <p className="muted">{approval.requires_aal2 ? "MFA AAL2 obrigatório" : "Aprovação padrão"}</p>
                    </div>
                    <span className={approval.status === "APPROVED" ? "badge badge-success" : approval.status === "REJECTED" ? "badge badge-danger" : "badge badge-warning"}>{approval.status}</span>
                  </div>
                  {approval.status === "PENDING" ? (
                    <form action={decideBudgetApproval} style={{ display: "grid", gap: 10 }}>
                      <input type="hidden" name="approvalId" value={approval.id} />
                      <input type="hidden" name="budgetId" value={budget.id} />
                      <label>Justificativa<input name="reason" required /></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="button button-primary" name="decision" value="APPROVED">Aprovar</button>
                        <button className="button button-secondary" name="decision" value="REJECTED">Rejeitar</button>
                      </div>
                    </form>
                  ) : <p>{approval.reason ?? "Sem comentário."}</p>}
                </article>
              ))}
              {!approvals?.length ? <p className="muted">Nenhuma aprovação solicitada.</p> : null}
            </div>
          </section>
        </div>

        <aside className="financial-rail" aria-label="Resumo financeiro interno">
          <small>RESUMO FINANCEIRO INTERNO</small>
          <div className="financial-row"><span>Custos diretos</span><strong className="mono">{formatCurrency(Number(version.direct_cost))}</strong></div>
          <div className="financial-row"><span>Custos indiretos</span><strong className="mono">{formatCurrency(Number(version.indirect_cost))}</strong></div>
          <div className="financial-row"><span>Custos fixos</span><strong className="mono">{formatCurrency(Number(version.fixed_cost))}</strong></div>
          <div className="financial-row"><span>Taxa administrativa</span><strong className="mono">{formatCurrency(Number(version.administrative_fee))}</strong></div>
          <div className="financial-row"><span>Custo-base</span><strong className="mono">{formatCurrency(baseCost)}</strong></div>
          {naturezas.length ? (
            <div className="financial-naturezas">
              <small>DO QUE É FEITO O CUSTO</small>
              {naturezas.map(natureza => (
                <div className="financial-row" key={natureza.natureza}>
                  <span>
                    {natureza.rotulo}
                    <em>{formatPercent(natureza.participacao)}</em>
                  </span>
                  <strong className="mono">{formatCurrency(natureza.total)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <div className="financial-row"><span>Impostos</span><strong className="mono">{formatPercent(Number(markupModel?.tax_rate ?? 0))}</strong></div>
          <div className="financial-row"><span>Margem desejada</span><strong className="mono">{formatPercent(Number(markupModel?.desired_margin_rate ?? 0))}</strong></div>
          <div className="financial-row"><span>BDI</span><strong className="mono">{formatPercent(Number(version.bdi_rate))}</strong></div>
          <div className="financial-row"><span>Markup</span><strong className="mono">{Number(version.markup_factor).toFixed(4)}</strong></div>
          <div className="financial-total"><small>PREÇO DE VENDA</small><strong>{formatCurrency(Number(version.sale_price))}</strong></div>
          <div className="financial-row"><span>Margem realizada</span><strong className="mono">{formatPercent(Number(version.gross_margin_rate))}</strong></div>
          <div className="financial-row"><span>Lucro estimado</span><strong className="mono">{formatCurrency(Number(version.estimated_profit))}</strong></div>
          <div className="financial-row"><span>ROI</span><strong className="mono">{version.estimated_roi_rate == null ? "—" : formatPercent(Number(version.estimated_roi_rate))}</strong></div>
          <div className="financial-row"><span>Payback</span><strong className="mono">{version.payback_month ? `Mês ${version.payback_month}` : "—"}</strong></div>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: 12 }}>Estes dados nunca são enviados ao portal do cliente.</p>
        </aside>
      </div>
    </main>
  );
}
