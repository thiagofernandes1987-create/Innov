import Link from "next/link";
import { Suspense } from "react";
import type { Avisos } from "@/lib/casca/avisos";
import type { Tema } from "@/lib/tema";
import { BuscaDaBarra } from "./busca-da-barra";
import { CantoDireito } from "./canto-direito";
import { NavegacaoDoModulo, type AplicativoAutorizado } from "./navegacao-do-modulo";

// Barra superior única, no lugar do menu lateral.
//
// Três faixas de conteúdo, na ordem do padrão de mercado: logotipo (que volta
// para a grade de aplicativos), ícone e nome do aplicativo em que se está com
// os menus dele, e o canto direito com tema, mensagens, notificações,
// configuração e usuário.
//
// Quem resolve qual é o módulo é `NavegacaoDoModulo`, no cliente: o layout do
// Next não re-renderiza em navegação suave, e resolver aqui congelava a barra
// no primeiro caminho visitado.

export function BarraSuperior({
  aplicativos,
  email,
  papel,
  tema,
  avisos,
  podeAdministrar
}: {
  aplicativos: AplicativoAutorizado[];
  email: string | null;
  papel: string;
  tema: Tema;
  avisos: Avisos;
  podeAdministrar: boolean;
}) {
  return (
    <header className="barra-superior">
      {/* Só a marca, sem o nome escrito ao lado. No padrão de mercado o canto
          esquerdo é um símbolo clicável que volta para a tela inicial; a
          palavra repetida ali é texto que não responde nenhuma pergunta e
          empurra o nome do aplicativo — o que importa — para a direita. */}
      <div className="barra-esquerda">
        <Link className="barra-logo" href="/app" title="Tela inicial" aria-label="Ir para a tela inicial de aplicativos">
          <span className="barra-logo-marca" aria-hidden="true">IN</span>
        </Link>
        <NavegacaoDoModulo aplicativos={aplicativos} />
      </div>

      {/* Centro: busca com facetas. Aparece só onde a tela sabe consumi-la —
          campo que aceita texto e não filtra nada ensina que a busca não
          funciona. Exceção declarada e datada na seção 12.4 do padrão. */}
      <Suspense fallback={<div className="barra-busca-vazia" aria-hidden="true" />}>
        <BuscaDaBarra />
      </Suspense>

      <div className="barra-direita">
        <CantoDireito
          mensagens={avisos.mensagens}
          atividades={avisos.atividades}
          naoLidas={avisos.naoLidas}
          pendentes={avisos.pendentes}
          podeAdministrar={podeAdministrar}
          email={email}
          papel={papel}
          tema={tema}
        />
      </div>
    </header>
  );
}
