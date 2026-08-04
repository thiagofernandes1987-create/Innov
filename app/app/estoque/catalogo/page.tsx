import {
  alternarCategoriaDeEstoque,
  alternarUnidadeDeEstoque,
  createInventoryCategory,
  createInventoryUnit
} from "@/app/actions/inventory-extra";
import { InventoryNavigation } from "@/components/inventory/inventory-navigation";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";

export const dynamic = "force-dynamic";

// Categorias e unidades do estoque.
//
// **T-33.20: estas duas escritas existiam sem tela.** `createInventoryCategory`
// e `createInventoryUnit` estavam escritas, revisadas e sem nenhum importador —
// e o formulário de item novo depende das duas listas: "Unidade" é obrigatória
// e vem de um `select`. A instalação do módulo semeia oito unidades e seis
// categorias, então nada estava quebrado; o que faltava era o caminho para a
// nona. Empresa que trabalha com "milheiro" ou que separa "elétrica" de
// "hidráulica" não tinha onde dizer isso.
//
// Desativar em vez de excluir, pela mesma razão da S-34: item já cadastrado
// escolheu esta unidade, e apagá-la arrancaria o "kg" de uma linha de estoque
// que existe. Desativada some do formulário de item novo e continua explicando
// o que já foi cadastrado.

export default async function InventoryCatalogPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const context = await requireCapability("estoque", "read");

  const [categorias, unidades] = await Promise.all([
    context.supabase
      .from("inventory_categories")
      .select("id,code,name,description,active")
      .eq("organization_id", context.organizationId)
      .order("code"),
    context.supabase
      .from("inventory_units")
      .select("id,code,name,decimal_places,active")
      .eq("organization_id", context.organizationId)
      .order("code")
  ]);
  reportDataAccessError("estoque-catalogo.categorias", categorias.error);
  reportDataAccessError("estoque-catalogo.unidades", unidades.error);

  const listaDeCategorias = categorias.data ?? [];
  const listaDeUnidades = unidades.data ?? [];
  const falhouLeitura = Boolean(categorias.error || unidades.error);

  return (
    <main className="content inventory-app">
      <section className="page-heading">
        <div>
          <span className="badge">ESTOQUE · CATÁLOGO</span>
          <h1>Categorias e unidades</h1>
          <p>
            O que o cadastro de item oferece nos dois seletores. {listaDeCategorias.filter(c => c.active).length}{" "}
            de {listaDeCategorias.length} categorias e {listaDeUnidades.filter(u => u.active).length} de{" "}
            {listaDeUnidades.length} unidades em uso.
          </p>
        </div>
      </section>

      <InventoryNavigation />

      {falhouLeitura ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}
      {error ? <div className="validation blocking" role="alert">{error}</div> : null}

      <section className="card card-pad">
        <h2>Unidades de medida</h2>
        <p className="muted">
          A unidade é obrigatória no item e não muda depois que há movimento: o saldo é contado
          nela. As casas decimais decidem se meia unidade existe — 0 para peças, 3 ou 4 para peso e
          volume.
        </p>

        <form action={createInventoryUnit} className="form-grid form-grid-3" style={{ marginTop: 14 }}>
          <label>
            Sigla
            <input name="code" required maxLength={12} placeholder="mlh" />
          </label>
          <label>
            Nome
            <input name="name" required maxLength={60} placeholder="Milheiro" />
          </label>
          <label>
            Casas decimais
            <input type="number" name="decimalPlaces" min="0" max="6" defaultValue="4" />
          </label>
          <button className="button button-primary" type="submit">Acrescentar unidade</button>
        </form>

        <table className="data-table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Unidade</th>
              <th>Casas</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {listaDeUnidades.map(unidade => (
              <tr key={String(unidade.id)} data-inativo={unidade.active ? "nao" : "sim"}>
                <td>
                  <strong>{String(unidade.code)}</strong> · {String(unidade.name)}
                </td>
                <td>{String(unidade.decimal_places)}</td>
                <td>
                  <form action={alternarUnidadeDeEstoque}>
                    <input type="hidden" name="id" value={String(unidade.id)} />
                    <input type="hidden" name="ativo" value={unidade.active ? "sim" : "nao"} />
                    <button className="button" type="submit">
                      {unidade.active ? "Em uso — desativar" : "Desativada — reativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>Categorias</h2>
        <p className="muted">
          Categoria é opcional no item e serve para agrupar o catálogo. O código curto é o que
          aparece no seletor, antes do nome.
        </p>

        <form action={createInventoryCategory} className="form-grid form-grid-3" style={{ marginTop: 14 }}>
          <label>
            Código
            <input name="code" required maxLength={12} placeholder="ELE" />
          </label>
          <label>
            Nome
            <input name="name" required maxLength={60} placeholder="Elétrica" />
          </label>
          <label>
            Dentro de
            <select name="parentId" defaultValue="">
              <option value="">Nenhuma — categoria de primeiro nível</option>
              {listaDeCategorias
                .filter(categoria => categoria.active)
                .map(categoria => (
                  <option key={String(categoria.id)} value={String(categoria.id)}>
                    {String(categoria.code)} · {String(categoria.name)}
                  </option>
                ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Descrição
            <input name="description" maxLength={160} placeholder="O que entra nesta categoria" />
          </label>
          <button className="button button-primary" type="submit">Acrescentar categoria</button>
        </form>

        <table className="data-table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {listaDeCategorias.map(categoria => (
              <tr key={String(categoria.id)} data-inativo={categoria.active ? "nao" : "sim"}>
                <td>
                  <strong>{String(categoria.code)}</strong> · {String(categoria.name)}
                </td>
                <td>{String(categoria.description ?? "")}</td>
                <td>
                  <form action={alternarCategoriaDeEstoque}>
                    <input type="hidden" name="id" value={String(categoria.id)} />
                    <input type="hidden" name="ativo" value={categoria.active ? "sim" : "nao"} />
                    <button className="button" type="submit">
                      {categoria.active ? "Em uso — desativar" : "Desativada — reativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
