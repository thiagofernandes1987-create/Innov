import { createClient } from "@/app/actions/clients";
import { requireModulePermission } from "@/lib/auth";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireModulePermission("clientes", "EDIT");

  return (
    <main className="content">
      <div className="page-head">
        <div><span className="badge">NOVO CADASTRO</span><h1>Novo cliente</h1><p className="muted">O cliente poderá possuir várias obras simultâneas e históricos independentes.</p></div>
      </div>
      {error ? <div className="validation blocking">{error}</div> : null}

      <section className="card card-pad" style={{ maxWidth: 900 }}>
        <form action={createClient} className="field-form">
          <div className="field-grid">
            <label>Tipo<select name="type" defaultValue="PERSON"><option value="PERSON">Pessoa física</option><option value="COMPANY">Pessoa jurídica</option></select></label>
            <label>Nome completo ou razão social<input name="legalName" required /></label>
            <label>Nome fantasia<input name="tradeName" /></label>
            <label>CPF ou CNPJ<input name="taxId" inputMode="numeric" /></label>
            <label>E-mail<input type="email" name="email" /></label>
            <label>Telefone<input name="phone" inputMode="tel" /></label>
            <label className="span-2">Endereço<input name="addressLine" /></label>
            <label>Cidade<input name="city" /></label>
            <label>Estado<input name="state" maxLength={2} /></label>
            <label>CEP<input name="postalCode" /></label>
            <label className="span-2">Observações<textarea name="notes" rows={4} /></label>
          </div>
          <div className="validation">CPF/CNPJ, quando informado, será normalizado e não poderá ser repetido na mesma organização.</div>
          <button className="button button-primary" type="submit">Cadastrar cliente</button>
        </form>
      </section>
    </main>
  );
}
