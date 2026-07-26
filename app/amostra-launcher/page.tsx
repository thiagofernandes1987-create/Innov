import { cookies } from "next/headers";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import { BarraSuperior } from "@/components/casca/barra-superior";
import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";

const TODOS: AplicativoAutorizado[] = [
  { chave: "crm", nome: "CRM e Vendas", descricao: "Leads, oportunidades e pipeline.", categoria: "Comercial", href: "#", nivel: "READ_WRITE" },
  { chave: "clientes", nome: "Clientes", descricao: "Cadastro e visão multiprojeto.", categoria: "Comercial", href: "#", nivel: "READ_WRITE" },
  { chave: "propostas", nome: "Propostas", descricao: "Propostas e versões liberadas.", categoria: "Comercial", href: "#", nivel: "READ" },
  { chave: "obras", nome: "Projetos", descricao: "Carteira e progresso executivo.", categoria: "Operacional", href: "#", nivel: "READ_WRITE" },
  { chave: "planejamento", nome: "Planejamento", descricao: "EAP, cronogramas e marcos.", categoria: "Operacional", href: "#", nivel: "READ_WRITE" },
  { chave: "tarefas", nome: "Tarefas", descricao: "Quadros de execução.", categoria: "Operacional", href: "#", nivel: "READ_WRITE" },
  { chave: "diario", nome: "Diário de campo", descricao: "Registros e evidências.", categoria: "Operacional", href: "#", nivel: "FULL" },
  { chave: "equipes", nome: "Equipes", descricao: "Integrantes e recursos.", categoria: "Operacional", href: "#", nivel: "READ" },
  { chave: "documentos", nome: "Documentos", descricao: "Arquivos e versões.", categoria: "Operacional", href: "#", nivel: "READ" },
  { chave: "qualidade", nome: "Qualidade", descricao: "Vistorias e não conformidades.", categoria: "Qualidade", href: "#", nivel: "READ_WRITE" },
  { chave: "orcamentos", nome: "Orçamentos", descricao: "Custos, BDI e cenários.", categoria: "Financeiro", href: "#", nivel: "READ_WRITE" },
  { chave: "financeiro", nome: "Financeiro", descricao: "Contas, parcelas e caixa.", categoria: "Financeiro", href: "#", nivel: "FULL" },
  { chave: "compras", nome: "Compras", descricao: "Cotações, pedidos e recebimentos.", categoria: "Suprimentos", href: "#", nivel: "READ_WRITE" },
  { chave: "estoque", nome: "Estoque", descricao: "Entradas, saídas e inventários.", categoria: "Suprimentos", href: "#", nivel: "READ" },
  { chave: "contratos", nome: "Contratos", descricao: "Partes, versões e vigência.", categoria: "Jurídico", href: "#", nivel: "READ" },
  { chave: "assinaturas", nome: "Assinaturas", descricao: "Envelopes e evidências.", categoria: "Jurídico", href: "#", nivel: "READ" },
  { chave: "aditivos", nome: "Aditivos", descricao: "Valor, escopo e prazo.", categoria: "Jurídico", href: "#", nivel: "READ" },
  { chave: "sac", nome: "Pós-venda e SAC", descricao: "Chamados e assistência.", categoria: "Pós-venda", href: "#", nivel: "READ_WRITE" },
  { chave: "relatorios", nome: "Relatórios", descricao: "Painéis e indicadores.", categoria: "Geral", href: "#", nivel: "READ" },
  { chave: "auditoria", nome: "Auditoria", descricao: "Eventos e alterações.", categoria: "Núcleo", href: "#", nivel: "READ" },
  { chave: "administracao", nome: "Administração", descricao: "Perfis, usuários e permissões.", categoria: "Núcleo", href: "#", nivel: "FULL" }
];

const PERFIS: Record<string, string[]> = {
  producao: ["diario", "tarefas", "clientes", "planejamento", "equipes", "documentos"],
  financeiro: ["financeiro", "orcamentos", "clientes", "tarefas", "contratos", "compras", "relatorios"],
  admin: TODOS.map(a => a.chave)
};

export default async function Amostra({ searchParams }: { searchParams: Promise<{ perfil?: string }> }) {
  const { perfil = "admin" } = await searchParams;
  const permitidos = new Set(PERFIS[perfil] ?? PERFIS.admin);
  const aplicativos = TODOS.filter(a => permitidos.has(a.chave));
  const email = `${perfil}@innovar.com.br`;
  const papel = { producao: "Produção", financeiro: "Financeiro", admin: "Administrador" }[perfil] ?? "Administrador";
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <div className="casca">
      <BarraSuperior moduloAtual={null} email={email} papel={papel} tema={tema} />
      <div className="casca-conteudo">
        <main className="content pagina-launcher">
          <section className="launcher-cabecalho">
            <h1>Olá, {perfil}.</h1>
            <p>Estes são os aplicativos liberados para o seu perfil nesta organização.</p>
          </section>
          <Launcher aplicativos={aplicativos} />
        </main>
      </div>
    </div>
  );
}
