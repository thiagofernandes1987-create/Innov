"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { marcarVisto } from "@/app/actions/avisos";
import { signOut } from "@/app/actions/auth";
import type { Tema } from "@/lib/tema";
import { AlternadorTema } from "./alternador-tema";
import type { AtividadeAviso, MensagemAviso } from "@/lib/casca/avisos";
import { ROTULO_ATIVIDADE, ROTULO_OBSERVACAO, type TipoAtividade } from "@/lib/pipeline/atividades";

// Canto direito da barra: mensagens, notificações e configuração.
//
// Os três abrem painel, não página. O que se faz nesse canto é olhar e
// decidir se vale interromper o que se está fazendo — mandar isso para outra
// rota perde o lugar de quem só queria conferir.
//
// Um painel por vez, todos fecham com Escape e com clique fora, e o foco
// volta para o botão que abriu. Painel que rouba o foco e não devolve deixa
// quem usa teclado no começo da página.

type Painel = "mensagens" | "notificacoes" | "configuracao";

function useForaEEscape(aberto: boolean, fechar: () => void) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) fechar();
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") fechar();
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto, fechar]);
  return caixa;
}

function formatarQuando(iso: string): string {
  const minutos = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutos)) return "";
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function formatarPrazo(iso: string | null): string {
  if (!iso) return "sem prazo";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function CantoDireito({
  mensagens,
  atividades,
  naoLidas,
  pendentes,
  podeAdministrar,
  email,
  papel,
  tema
}: {
  mensagens: MensagemAviso[];
  atividades: AtividadeAviso[];
  naoLidas: number;
  pendentes: number;
  podeAdministrar: boolean;
  email: string | null;
  papel: string;
  tema: Tema;
}) {
  const [aberto, setAberto] = useState<Painel | null>(null);
  const [, iniciar] = useTransition();
  const prefixo = useId();
  const caixa = useForaEEscape(aberto !== null, () => setAberto(null));

  function alternar(painel: Painel) {
    // O próximo estado é calculado fora do atualizador de propósito: a função
    // passada a `setState` roda durante a renderização, e disparar transição
    // dali é erro de React — o painel não abria e o console acusava
    // "Cannot call startTransition while rendering".
    const proximo = aberto === painel ? null : painel;
    setAberto(proximo);
    // Abrir o painel é o ato de ler: é aí que o marco de "visto" avança.
    if (proximo === "mensagens" && naoLidas > 0) iniciar(() => marcarVisto("mensagens"));
    if (proximo === "notificacoes" && pendentes > 0) iniciar(() => marcarVisto("atividades"));
  }

  return (
    <div className="canto-direito" ref={caixa}>
      <button
        type="button"
        className="canto-botao"
        aria-label={naoLidas > 0 ? `Mensagens, ${naoLidas} não lidas` : "Mensagens"}
        aria-expanded={aberto === "mensagens"}
        aria-controls={`${prefixo}-mensagens`}
        title="Mensagens"
        onClick={() => alternar("mensagens")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17H9.5L5 20.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        {naoLidas > 0 ? <span className="canto-selo" aria-hidden="true">{naoLidas > 9 ? "9+" : naoLidas}</span> : null}
      </button>

      <button
        type="button"
        className="canto-botao"
        aria-label={pendentes > 0 ? `Notificações, ${pendentes} atividades em aberto` : "Notificações"}
        aria-expanded={aberto === "notificacoes"}
        aria-controls={`${prefixo}-notificacoes`}
        title="Notificações"
        onClick={() => alternar("notificacoes")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5c0 4.5-1.7 6-1.7 6h14.4s-1.7-1.5-1.7-6A5.5 5.5 0 0 0 12 3.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10.2 18.2a2 2 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {pendentes > 0 ? (
          <span className="canto-selo alerta" aria-hidden="true">{pendentes > 9 ? "9+" : pendentes}</span>
        ) : null}
      </button>

      {/* Avatar, não engrenagem. O nome do usuário por extenso e o botão "Sair"
          ocupavam a barra o dia inteiro para uma ação que se faz uma vez por
          dia; as quatro ferramentas do padrão põem tudo isso dentro do avatar,
          junto com tema e dados da conta. */}
      <button
        type="button"
        className="canto-avatar"
        aria-label={`Conta de ${email ?? "usuário"}`}
        aria-expanded={aberto === "configuracao"}
        aria-controls={`${prefixo}-configuracao`}
        title={email ?? "Conta"}
        onClick={() => alternar("configuracao")}
      >
        <span aria-hidden="true">{iniciais(email)}</span>
      </button>

      {aberto === "mensagens" ? (
        <div className="canto-painel" id={`${prefixo}-mensagens`} role="dialog" aria-label="Mensagens">
          <header>
            <strong>Mensagens</strong>
            <span>dos cartões que você responde ou segue</span>
          </header>
          {mensagens.length === 0 ? (
            <p className="canto-vazio">Nada novo nos últimos 14 dias.</p>
          ) : (
            <ul>
              {mensagens.map(item => (
                <li key={item.id} className={item.nova ? "nova" : undefined}>
                  <Link href={`/app/pipeline/${item.trilha}/${item.cardId}`} onClick={() => setAberto(null)}>
                    <span className="canto-linha-topo">
                      <strong>{item.autor}</strong>
                      <small>{formatarQuando(item.quando)}</small>
                    </span>
                    <span className="canto-linha-corpo">{item.corpo}</span>
                    <small className="canto-linha-origem">
                      {ROTULO_OBSERVACAO[item.tipo as keyof typeof ROTULO_OBSERVACAO] ?? item.tipo} · {item.cartao}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {aberto === "notificacoes" ? (
        <div className="canto-painel" id={`${prefixo}-notificacoes`} role="dialog" aria-label="Notificações">
          <header>
            <strong>Notificações</strong>
            <span>o que está no seu nome, sem data ou já no prazo</span>
          </header>
          {atividades.length === 0 ? (
            <p className="canto-vazio">Nenhuma atividade em aberto para você.</p>
          ) : (
            <ul>
              {atividades.map(item => (
                <li key={item.id} className={item.atrasada ? "atrasada" : undefined}>
                  <Link href={`/app/pipeline/${item.trilha}/${item.cardId}`} onClick={() => setAberto(null)}>
                    <span className="canto-linha-topo">
                      <strong>{item.titulo}</strong>
                      <small className={item.atrasada ? "canto-prazo atrasado" : "canto-prazo"}>
                        {item.atrasada ? "atrasada · " : ""}
                        {formatarPrazo(item.prazo)}
                      </small>
                    </span>
                    <small className="canto-linha-origem">
                      {ROTULO_ATIVIDADE[item.tipo as TipoAtividade] ?? item.tipo} · {item.cartao}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {aberto === "configuracao" ? (
        <div className="canto-painel canto-painel-estreito" id={`${prefixo}-configuracao`} role="dialog" aria-label="Configuração">
          <header>
            <strong>{email ?? "—"}</strong>
            <span>{papel}</span>
          </header>
          <ul>
            <li>
              <Link href="/app" onClick={() => setAberto(null)}>
                Todos os aplicativos
              </Link>
            </li>
            <li>
              <Link href="/app/tarefas" onClick={() => setAberto(null)}>
                Minhas tarefas
              </Link>
            </li>
            {podeAdministrar ? (
              <>
                <li>
                  <Link href="/app/administracao" onClick={() => setAberto(null)}>
                    Administração
                  </Link>
                </li>
                <li>
                  <Link href="/app/administracao/usuarios" onClick={() => setAberto(null)}>
                    Usuários e permissões
                  </Link>
                </li>
                <li>
                  <Link href="/app/auditoria" onClick={() => setAberto(null)}>
                    Auditoria
                  </Link>
                </li>
              </>
            ) : null}
          </ul>

          <div className="canto-tema">
            <span className="canto-tema-rotulo">Tema</span>
            <AlternadorTema atual={tema} />
          </div>

          <form action={signOut} className="canto-sair">
            <button type="submit">Sair</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/** Duas letras do e-mail: `admin@admin.com` vira `AD`. */
function iniciais(email: string | null): string {
  const local = (email ?? "").split("@")[0].replace(/[^a-zA-ZÀ-ÿ]/g, " ").trim();
  if (!local) return "?";
  const partes = local.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
