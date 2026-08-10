import { cookies } from "next/headers";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import { BarraSuperior } from "@/components/casca/barra-superior";
import { ProvedorDeBusca } from "@/components/casca/busca-da-barra";
import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";
import type { LauncherSummaryMap } from "@/lib/casca/launcher-domain";
import { MODULE_REGISTRY } from "@/lib/modules/registry";

const TODOS: AplicativoAutorizado[] = MODULE_REGISTRY
  .filter(modulo => modulo.key !== "dashboard")
  .map(modulo => ({
    chave: modulo.key,
    nome: modulo.name,
    descricao: modulo.description,
    categoria: modulo.category,
    href: `#${modulo.key}`,
    nivel: "READ_WRITE"
  }));

const RESUMOS_DEMONSTRACAO: LauncherSummaryMap = {
  crm: { label: "Oportunidades ativas", value: "12", support: "R$ 11,4 mi no pipeline", secondaryLabel: "Leads", secondaryValue: "28", progress: 42, available: true, recent: [
    { id: "1", title: "Condomínio Residencial Aurora", subtitle: "Negociação", meta: "R$ 680 mil", href: "#crm" },
    { id: "2", title: "Hospital São Lucas — Ampliação", subtitle: "Proposta", meta: "R$ 1,25 mi", href: "#crm" },
    { id: "3", title: "Porto Marítimo — Armazém 04", subtitle: "Prospecção", meta: "R$ 2,4 mi", href: "#crm" }
  ] },
  clientes: { label: "Clientes ativos", value: "1.243", support: "86% da base", progress: 86, available: true },
  obras: { label: "Obras em andamento", value: "18", support: "63% de avanço médio", progress: 63, available: true },
  planejamento: { label: "Cronogramas controlados", value: "27", support: "4 marcos próximos", progress: 71, available: true },
  tarefas: { label: "Tarefas em aberto", value: "142", support: "18 atrasadas", progress: 78, available: true },
  diario: { label: "Registros de obra", value: "326", support: "Último hoje", progress: 92, available: true },
  equipes: { label: "Pessoas alocadas", value: "236", support: "14 equipes ativas", progress: 76, available: true },
  orcamentos: { label: "Orçamentos na carteira", value: "14", support: "R$ 32,7 mi orçados", progress: 68, available: true },
  propostas: { label: "Propostas", value: "23", support: "37% de conversão", progress: 37, available: true },
  contratos: { label: "Contratos ativos", value: "31", support: "4 aditivos pendentes", progress: 82, available: true },
  documentos: { label: "Documentos", value: "8.742", support: "64% de 15 GB", progress: 64, available: true },
  modelos: { label: "Modelos publicados", value: "46", support: "Biblioteca corporativa", progress: 74, available: true },
  qualidade: { label: "Não conformidades", value: "9", support: "92% conformidade", progress: 92, available: true },
  whatsapp: { label: "Conversas abertas", value: "8", support: "Canal oficial conectado", progress: 84, available: true }
};

const PERFIS: Record<string, string[]> = {
  producao: ["diario", "tarefas", "clientes", "planejamento", "equipes", "documentos"],
  financeiro: ["financeiro", "orcamentos", "clientes", "tarefas", "contratos", "compras", "relatorios"],
  admin: TODOS.map(a => a.chave)
};

export default async function Amostra({ searchParams }: { searchParams: Promise<{ perfil?: string; cenario?: string }> }) {
  const { perfil = "admin", cenario = "normal" } = await searchParams;
  const permitidos = new Set(PERFIS[perfil] ?? PERFIS.admin);
  const aplicativos = TODOS.filter(a => permitidos.has(a.chave));
  const email = `${perfil}@innovar.com.br`;
  const papel = { producao: "Produção", financeiro: "Financeiro", admin: "Administrador" }[perfil] ?? "Administrador";
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);
  const operacionais = cenario === "problema"
    ? [{ id: "demo-operacional-1", eventoId: "demo-evento-1", titulo: "Entrega da marcenaria em risco", corpo: "Sete dias no caminho crítico. Integre as restrições, confirme donos e publique uma única previsão.", modulo: "planejamento", moduloNome: "Planejamento", href: "#planejamento", persona: "P8" as const, prazoResposta: "2026-07-28T14:00:00.000Z", escalada: true, nova: true, criadaEm: "2026-07-28T12:00:00.000Z" }]
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
            <Launcher aplicativos={aplicativos} resumos={RESUMOS_DEMONSTRACAO} />
          </main>
        </div>
      </div>
    </ProvedorDeBusca>
  );
}
