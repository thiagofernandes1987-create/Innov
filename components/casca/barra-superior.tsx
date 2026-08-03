import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import type { Avisos } from "@/lib/casca/avisos";
import type { Tema } from "@/lib/tema";
import { BuscaGlobal } from "./busca-da-barra";
import { CantoDireito } from "./canto-direito";
import { NavegacaoDoModulo, type AplicativoAutorizado } from "./navegacao-do-modulo";

export function BarraSuperior({
  aplicativos,
  email,
  papel,
  tema,
  avisos,
  podeAdministrar,
  organizationName = "Innovar Construções",
  persistirAvisos = true
}: {
  aplicativos: AplicativoAutorizado[];
  email: string | null;
  papel: string;
  tema: Tema;
  avisos: Avisos;
  podeAdministrar: boolean;
  organizationName?: string;
  persistirAvisos?: boolean;
}) {
  return (
    <header className="barra-superior">
      <div className="barra-esquerda">
        <Link className="barra-logo" href="/app" title="Tela inicial" aria-label="Ir para a tela inicial de aplicativos">
          {/* Marca real, do manual entregue pelo responsável em 3 de agosto.
              Antes eram as letras "IN" em cobre sobre a barra escura — 2,87:1,
              a única reprovação de contraste que sobrava em toda tela medida.
              O símbolo é imagem, e imagem não tem contraste de texto a cumprir;
              o nome ao lado continua em texto, e é ele que os leitores de tela
              e a busca do navegador encontram. */}
          <Image
            className="barra-logo-marca"
            src="/marca/innovar-icone.png"
            alt=""
            width={151}
            height={153}
            priority
          />
          <span className="barra-logo-nome">INNOVAR</span>
        </Link>

        <Link
          className="barra-organizacao"
          href="/selecionar-organizacao"
          aria-label={`Trocar organização. Atual: ${organizationName}`}
        >
          <span>{organizationName}</span>
          <CaretDown size={15} weight="bold" aria-hidden="true" />
        </Link>

        <NavegacaoDoModulo aplicativos={aplicativos} />
      </div>

      <BuscaGlobal />

      <div className="barra-direita">
        <CantoDireito
          mensagens={avisos.mensagens}
          atividades={avisos.atividades}
          operacionais={avisos.operacionais}
          naoLidas={avisos.naoLidas}
          pendentes={avisos.pendentes}
          podeAdministrar={podeAdministrar}
          email={email}
          papel={papel}
          tema={tema}
          persistirAvisos={persistirAvisos}
        />
      </div>
    </header>
  );
}
