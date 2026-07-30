import { cookies } from "next/headers";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import { BarraSuperior } from "@/components/casca/barra-superior";
import { ProvedorDeBusca } from "@/components/casca/busca-da-barra";
import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";
import type { LauncherSummaryMap } from "@/lib/casca/launcher-domain";

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

// A amostra existe para validar composição e responsividade. Sem dados
// confirmados, o Launcher apresenta o estado indisponível do contrato.
const RESUMOS: LauncherSummaryMap = {};

export default async function Amostra({ searchParams }: { searchParams: Promise<{ perfil?: string; cenario?: string }> }) {
  const { perfil = "admin", cenario = "normal" } = await searchParams;
  const permitidos = new Set(PERFIS[perfil] ?? PERFIS.admin);
  const aplicativos = TODOS.filter(a => permitidos.has(a.chave));
  const email = `${perfil}@innovar.com.br`;
  const papel = { producao: "Produção", financeiro: "Financeiro", admin: "Administrador" }[perfil] ?? "Administrador";
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);
  const operacionais = cenario === "problema"
    ? [
        {
          id: "demo-operacional-1",
          eventoId: "demo-evento-1",
          titulo: "Entrega da marcenaria em risco",
          corpo: "Sete dias no caminho crítico. Integre as restrições, confirme donos e publique uma única previsão.",
          modulo: "planejamento",
          moduloNome: "Planejamento",
          href: "#planejamento",
          persona: "P8" as const,
          prazoResposta: "2026-07-28T14:00:00.000Z",
          escalada: true,
          nova: true,
          criadaEm: "2026-07-28T12:00:00.000Z"
        },
        {
          id: "demo-operacional-2",
          eventoId: "demo-evento-2",
          titulo: "Material crítico sem confirmação",
          corpo: "O fornecedor não confirmou o marco de expedição. Verifique a alternativa e o custo total da parada.",
          modulo: "compras",
          moduloNome: "Compras e Suprimentos",
          href: "#compras",
          persona: "P9" as const,
          prazoResposta: "2026-07-29T10:00:00.000Z",
          escalada: false,
          nova: true,
          criadaEm: "2026-07-28T12:20:00.000Z"
        }
      ]
    : [];

  return (
    <ProvedorDeBusca>
      <div className="casca">
        {/* O estado normal permanece sem contadores inventados. `cenario=problema`
            é uma fixture visual explícita para verificar o estado pessimista. */}
        <BarraSuperior
          aplicativos={[]}
          email={email}
          papel={papel}
          tema={tema}
          avisos={{
            mensagens: [],
            atividades: [],
            operacionais,
            naoLidas: 0,
            pendentes: operacionais.length
          }}
          podeAdministrar={perfil === "admin"}
          persistirAvisos={false}
        />
        <div className="casca-conteudo">
          <main className="content pagina-launcher">
            <Launcher aplicativos={aplicativos} resumos={RESUMOS} />
          </main>
        </div>
      </div>
    </ProvedorDeBusca>
  );
}
