import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Avisos } from "@/lib/casca/avisos";
import type { Tema } from "@/lib/tema";
import { AlternadorTema } from "./alternador-tema";
import { CantoDireito } from "./canto-direito";
import { IconeDoModulo } from "./icones";

// Barra superior única, no lugar do menu lateral.
//
// O logotipo à esquerda volta para a grade de aplicativos — é o caminho de
// retorno que o padrão de mercado usa, e o único que o usuário precisa
// decorar. Ao lado dele, o nome do aplicativo em que se está: sem isso, uma
// tela sem menu lateral deixa de responder "onde eu estou".

export type ModuloAtual = { chave: string; nome: string } | null;

export function BarraSuperior({
  moduloAtual,
  email,
  papel,
  tema,
  avisos,
  podeAdministrar
}: {
  moduloAtual: ModuloAtual;
  email: string | null;
  papel: string;
  tema: Tema;
  avisos: Avisos;
  podeAdministrar: boolean;
}) {
  return (
    <header className="barra-superior">
      <Link className="barra-logo" href="/app" aria-label="Voltar para a grade de aplicativos">
        <span className="barra-logo-marca" aria-hidden="true">IN</span>
        <span className="barra-logo-nome">INNOVAR</span>
      </Link>

      {moduloAtual ? (
        <span className="barra-modulo">
          <span className="barra-modulo-icone" aria-hidden="true">
            <IconeDoModulo chave={moduloAtual.chave} />
          </span>
          <strong>{moduloAtual.nome}</strong>
        </span>
      ) : (
        <span className="barra-modulo barra-modulo-inicio">
          <strong>Aplicativos</strong>
        </span>
      )}

      <div className="barra-direita">
        <AlternadorTema atual={tema} />
        <CantoDireito
          mensagens={avisos.mensagens}
          atividades={avisos.atividades}
          naoLidas={avisos.naoLidas}
          pendentes={avisos.pendentes}
          podeAdministrar={podeAdministrar}
          email={email}
          papel={papel}
        />
        <span className="barra-usuario">
          <strong>{email ?? "—"}</strong>
          <small>{papel}</small>
        </span>
        <form action={signOut}>
          <button className="barra-sair" type="submit">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
