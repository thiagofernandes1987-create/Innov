"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menusDe } from "@/lib/casca/menus";
import { corDoModulo, IconeDoModulo } from "./icones";

// Ícone, nome e menus do módulo — resolvidos no cliente, de propósito.
//
// A primeira versão resolvia isso no servidor, lendo `x-pathname` no layout. O
// layout do Next não é re-renderizado em navegação suave dentro da mesma
// subárvore: ir de `/app/pipeline/cliente` para `/app/pipeline/projeto` troca a
// página e mantém o layout. O `h1` mudava e o menu ativo continuava marcando a
// trilha anterior — a barra passava a mentir sobre onde a pessoa estava.
//
// `usePathname` acompanha a navegação. A lista de aplicativos continua vindo do
// servidor, porque é dado de permissão e não se decide no navegador; o que é
// feito aqui é só casar caminho com módulo.

export type AplicativoAutorizado = { chave: string; nome: string; prefixo: string };

/**
 * O funil pertence ao aplicativo, não o contrário.
 *
 * `/app/pipeline/cliente` é a tela de funil **do CRM**; `/app/pipeline/projeto`
 * é a de Projetos; `/app/pipeline/assistencia` é a de Chamados. A barra mostra
 * o aplicativo dono, com os menus dele — quem está vendendo não atravessa o
 * funil de obra para chegar no seu.
 *
 * O nome exibido continua vindo do catálogo de módulos da organização: se a
 * empresa renomear "Obras" para "Projetos", a barra acompanha.
 */
const MODULO_DA_ROTA: { prefixo: string; chave: string }[] = [
  { prefixo: "/app/pipeline/cliente", chave: "crm" },
  { prefixo: "/app/pipeline/projeto", chave: "obras" },
  { prefixo: "/app/pipeline/assistencia", chave: "sac" }
];

export function NavegacaoDoModulo({ aplicativos }: { aplicativos: AplicativoAutorizado[] }) {
  const caminho = usePathname() ?? "";

  // Prefixo mais longo vence, senão `/app` casaria com tudo e `/app/cliente`
  // casaria com `/app/clientes`.
  const doCatalogo = aplicativos
    .filter(item => item.chave !== "dashboard" && caminho.startsWith(item.prefixo))
    .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];

  // Rota emprestada resolve para o aplicativo dono, e o nome vem do catálogo
  // da organização — não de um rótulo fixo aqui dentro.
  const emprestada = MODULO_DA_ROTA.find(item => caminho.startsWith(item.prefixo));
  const dono = emprestada ? aplicativos.find(item => item.chave === emprestada.chave) : undefined;

  const modulo = doCatalogo ?? dono ?? null;

  if (!modulo) {
    return (
      <span className="barra-modulo barra-modulo-inicio">
        <strong>Aplicativos</strong>
      </span>
    );
  }

  const menus = menusDe(modulo.chave);
  const ativo = menus
    .filter(item => caminho === item.href || caminho.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)
    .map(item => item.href)[0];

  return (
    <>
      <span className="barra-modulo">
        <span className="barra-modulo-icone" style={{ color: corDoModulo(modulo.chave) }} aria-hidden="true">
          <IconeDoModulo chave={modulo.chave} />
        </span>
        <strong title={modulo.nome}>{modulo.nome}</strong>
      </span>

      {menus.length > 0 ? (
        <nav className="barra-menus" aria-label={`Menu de ${modulo.nome}`}>
          {menus.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === ativo ? "barra-menu ativo" : "barra-menu"}
              aria-current={item.href === ativo ? "page" : undefined}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
