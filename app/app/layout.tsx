import { headers } from "next/headers";
import { BarraSuperior, type ModuloAtual } from "@/components/casca/barra-superior";
import { getEffectiveApplications } from "@/lib/authorization";

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

  return (
    <div className="casca">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <BarraSuperior moduloAtual={moduloAtual} email={context.email} papel={context.role} />
      <div id="conteudo-principal" className="casca-conteudo" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
