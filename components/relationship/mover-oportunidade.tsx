"use client";

import { useState } from "react";
import { moveCrmOpportunityStage } from "@/app/actions/relationship";
import type { ItemDeLista } from "@/lib/listas/servidor";

// Mover oportunidade no funil.
//
// **Ao escolher "Perdida", abre o formulário de perda** com os motivos
// cadastrados — pedido do responsável: *"quando for para perdido precisa abrir
// um formulário com os motivos da perca do lead, tipo parou de responder,
// praça errada, Produto errado, etc… esses itens tem que ser possível
// cadastrar no menu"*.
//
// Motivo e observação continuam sendo dois campos, e agora a diferença entre
// eles fica evidente na própria interface: o motivo é **escolhido** de uma
// lista curada, porque alimenta contagem — "quantos perdemos por preço neste
// trimestre" — e contagem sobre texto que cada pessoa escreve do seu jeito não
// fecha. O relato do caso vai na observação, que é livre.
//
// A lista vem de `/app/administracao/motivos-de-perda`. Quando ela está vazia,
// a tela diz onde cadastrar em vez de mostrar um seletor sem opção.

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
  motivosDePerda,
  podeAdministrar
}: {
  oportunidadeId: string;
  motivosDePerda: ItemDeLista[];
  podeAdministrar: boolean;
}) {
  const [estagio, setEstagio] = useState<string>("PROSPECTING");
  const perdida = estagio === "LOST";
  const semLista = perdida && motivosDePerda.length === 0;

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

      {perdida && !semLista ? (
        <fieldset className="formulario-de-perda">
          <legend>Por que este negócio foi perdido?</legend>
          {/* Rádio, e não seleção suspensa: são nove opções curtas, e a lista
              aberta deixa a pessoa comparar antes de escolher. Escondê-las
              atrás de um clique convida a marcar sempre a primeira. */}
          <div className="formulario-de-perda-opcoes">
            {motivosDePerda.map((motivo, indice) => (
              <label key={motivo.id} className="opcao-de-motivo">
                <input type="radio" name="reason" value={motivo.rotulo} required defaultChecked={false} data-primeiro={indice === 0} />
                <span>{motivo.rotulo}</span>
              </label>
            ))}
          </div>
          <p className="muted">
            O relato do caso vai na observação, logo abaixo. O motivo é o que permite somar por
            trimestre.
          </p>
        </fieldset>
      ) : null}

      {semLista ? (
        <div className="validation blocking" role="alert">
          Nenhum motivo de perda cadastrado.{" "}
          {podeAdministrar
            ? "Cadastre em Administração → Motivos de perda antes de encerrar o negócio."
            : "Peça ao administrador para cadastrar em Administração → Motivos de perda."}
        </div>
      ) : null}

      <label>
        <span>Observação</span>
        <textarea name="note" rows={perdida ? 3 : 4} placeholder="O que aconteceu neste negócio." />
      </label>

      <button className="button button-primary" type="submit" disabled={semLista}>
        Atualizar funil
      </button>
    </form>
  );
}
