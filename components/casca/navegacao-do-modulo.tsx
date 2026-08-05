"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { menusDe } from "@/lib/casca/menus";
import { corDoModulo, IconeDoModulo } from "./icones";

export type AplicativoAutorizado = { chave: string; nome: string; prefixo: string };

const MODULO_DA_ROTA: { prefixo: string; chave: string }[] = [
  { prefixo: "/app/pipeline/cliente", chave: "crm" },
  { prefixo: "/app/pipeline/projeto", chave: "obras" },
  { prefixo: "/app/pipeline/assistencia", chave: "sac" }
];

export function NavegacaoDoModulo({ aplicativos }: { aplicativos: AplicativoAutorizado[] }) {
  const caminho = usePathname() ?? "";
  const [caminhoDoMenuAberto, setCaminhoDoMenuAberto] = useState<string | null>(null);
  const menuAberto = caminhoDoMenuAberto === caminho;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;

    function fecharAoClicarFora(evento: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) setCaminhoDoMenuAberto(null);
    }

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCaminhoDoMenuAberto(null);
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("touchstart", fecharAoClicarFora, { passive: true });
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("touchstart", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [menuAberto]);

  const doCatalogo = aplicativos
    .filter(item => item.chave !== "dashboard" && caminho.startsWith(item.prefixo))
    .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];

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
        <>
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

          <div className="barra-menu-movel" ref={menuRef}>
            <button
              type="button"
              className="barra-menu-movel-gatilho"
              aria-label={`Menu de ${modulo.nome}`}
              aria-expanded={menuAberto}
              aria-controls="barra-menu-movel-conteudo"
              onClick={() => setCaminhoDoMenuAberto(menuAberto ? null : caminho)}
            >
              Menu
            </button>
            {menuAberto ? (
              <nav id="barra-menu-movel-conteudo" aria-label={`Menu compacto de ${modulo.nome}`}>
                {menus.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={item.href === ativo ? "ativo" : undefined}
                    aria-current={item.href === ativo ? "page" : undefined}
                    onClick={() => setCaminhoDoMenuAberto(null)}
                  >
                    {item.rotulo}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
