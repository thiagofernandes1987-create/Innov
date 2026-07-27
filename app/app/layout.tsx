import { cookies, headers } from "next/headers";
import { BarraSuperior, type ModuloAtual } from "@/components/casca/barra-superior";
import { carregarAvisos } from "@/lib/casca/avisos";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import { getEffectiveApplications, hasCapability } from "@/lib/authorization";

export const dynamic = "force-dynamic";

// Casca vertical: barra superior e conteúdo. Sem menu lateral.
//
// O menu lateral listava todos os aplicativos autorizados em toda tela, o tempo
// inteiro, roubando 278px de largura de tabelas e kanbans que precisam dela. A
// navegação passa a ser: logotipo → grade de aplicativos → aplicativo. Um passo
// a mais para trocar de módulo, nenhum para trabalhar dentro dele.

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { context, applications } = await getEffectiveApplications();

  // O caminho da requisição diz em que aplicativo se está. O prefixo mais
  // longo vence, senão `/app` casaria com tudo.
  const caminho = (await headers()).get("x-pathname") ?? "";
  const moduloAtual: ModuloAtual = applications
    .filter(item => item.applicationKey !== "dashboard" && caminho.startsWith(item.routePrefix))
    .sort((a, b) => b.routePrefix.length - a.routePrefix.length)
    .map(item => ({ chave: item.applicationKey, nome: item.name }))[0] ?? null;

  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);

  // Avisos não podem derrubar a casca: uma tabela do pipeline ausente em um
  // ambiente atrasado deixaria o usuário sem barra, sem logotipo e sem saída.
  const [avisos, podeAdministrar] = await Promise.all([
    carregarAvisos().catch(() => ({ mensagens: [], atividades: [], naoLidas: 0, pendentes: 0 })),
    hasCapability("administracao", "manage", null, context)
  ]);

  return (
    <div className="casca">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <BarraSuperior
        moduloAtual={moduloAtual}
        email={context.email}
        papel={context.role}
        tema={tema}
        avisos={avisos}
        podeAdministrar={podeAdministrar}
      />
      <div id="conteudo-principal" className="casca-conteudo" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
