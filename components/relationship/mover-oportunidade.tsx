"use client";

import { useState } from "react";
import { moveCrmOpportunityStage } from "@/app/actions/relationship";
import { CampoComSugestao } from "@/components/comum/campo-com-sugestao";
import type { ValorDoCatalogo } from "@/lib/sugestoes/catalogo";

// Mover oportunidade no funil — T-32.0.6.
//
// **Motivo e observação são dois campos.** Antes eram um só, rotulado
// "Motivo/observação", e as duas coisas que ele carregava são diferentes em
// natureza: motivo é curto, se repete entre negócios e serve para contar;
// observação é prosa daquele negócio. Juntas, nenhuma das duas funciona — não
// se soma motivo de perda por trimestre quando cada linha é uma frase
// diferente, e quem quer somar acaba padronizando a frase e perdendo o relato.
//
// O motivo **só aparece ao escolher "Perdida"**, que é o único estágio em que
// ele existe. Mostrar sempre transformaria em ruído permanente um campo que
// serve a um caso; e o campo com sugestão só faz sentido onde há vocabulário
// compartilhado — a observação nunca é sugerida, de propósito.

const ESTAGIOS = [
  ["PROSPECTING", "Prospecção"],
  ["QUALIFIED", "Qualificada"],
  ["PROPOSAL", "Proposta"],
  ["NEGOTIATION", "Negociação"],
  ["WON", "Ganha"],
  ["LOST", "Perdida"]
] as const;

export function MoverOportunidade({
  oportunidadeId,
  sugestoesDeMotivo
}: {
  oportunidadeId: string;
  sugestoesDeMotivo: ValorDoCatalogo[];
}) {
  const [estagio, setEstagio] = useState<string>("PROSPECTING");
  const perdida = estagio === "LOST";

  return (
    <form action={moveCrmOpportunityStage} className="relationship-form compact">
      <input type="hidden" name="opportunityId" value={oportunidadeId} />
      <label>
        <span>Novo estágio</span>
        <select name="stage" value={estagio} onChange={e => setEstagio(e.target.value)}>
          {ESTAGIOS.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </label>

      {perdida ? (
        <label>
          <span>Motivo da perda</span>
          <CampoComSugestao
            name="reason"
            sugestoes={sugestoesDeMotivo}
            required
            maxLength={80}
            placeholder="Preço, prazo, concorrente…"
          />
          <small className="muted">
            Curto e repetível — é o que permite somar por trimestre. O relato do caso vai na
            observação.
          </small>
        </label>
      ) : null}

      <label>
        <span>Observação</span>
        <textarea name="note" rows={perdida ? 3 : 4} placeholder="O que aconteceu neste negócio." />
      </label>

      <button className="button button-primary" type="submit">Atualizar funil</button>
    </form>
  );
}
