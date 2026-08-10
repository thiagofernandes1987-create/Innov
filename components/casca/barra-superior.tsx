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
          {/* Só o símbolo, branco, sem o nome ao lado.
              Decisão do responsável em 3 de agosto: *"quero construir minha
              identidade, precisam olhar o logo e identificar a marca"*. Símbolo
              acompanhado do nome escrito nunca é aprendido — quem lê a palavra
              não precisa reconhecer a forma, e a forma é o que se quer que
              fique. O nome por extenso fica na tela de login, uma vez, no
              lockup horizontal.

              O nome sai da tela, **não da acessibilidade**: o `aria-label` do
              link continua dizendo para onde ele leva, e é isso que o leitor de
              tela anuncia. Símbolo sozinho sem rótulo seria um botão mudo. */}
          <Image
            className="barra-logo-marca"
            src="/marca/innovar-icone-branco.png"
            alt=""
            width={151}
            height={153}
            priority
          />
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
