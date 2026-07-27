"use client";

import { useMemo, useState } from "react";
import {
  cadeiaMaisLonga,
  calcular,
  ROTULO_DEPENDENCIA,
  SIGLA_PT,
  type Dependencia,
  type TarefaCronograma
} from "@/lib/planejamento/cronograma";

// Gantt — barras em escala de tempo, com dependência.
//
// Pedido do responsável no print do planejamento: "era para abrir uma nova
// página com gantt para realizar o planejamento, como se fosse um Project, com
// datas de início e término, dependências de tarefas, Início-Início, I-Término,
// T-T, T-I, dias programados".
//
// O cálculo mora em `lib/planejamento/cronograma.ts`, testado por 17 casos
// antes desta tela existir — inclusive virada de mês e de ano. Aqui só se
// desenha o que ele devolve.

const LARGURA_DIA = 26;
const DIA = 86_400_000;

function paraDia(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / DIA;
}

function rotuloDia(dia: number): { texto: string; mes: string; fimDeSemana: boolean } {
  const data = new Date(dia * DIA);
  return {
    texto: String(data.getUTCDate()).padStart(2, "0"),
    mes: data.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }),
    fimDeSemana: data.getUTCDay() === 0 || data.getUTCDay() === 6
  };
}

export function Gantt({
  tarefas,
  dependencias,
  hoje
}: {
  tarefas: TarefaCronograma[];
  dependencias: Dependencia[];
  hoje: string;
}) {
  const [destacarCadeia, setDestacarCadeia] = useState(true);

  const { barras, ciclo } = useMemo(() => calcular(tarefas, dependencias), [tarefas, dependencias]);
  const cadeia = useMemo(
    () => (destacarCadeia ? cadeiaMaisLonga(barras, dependencias) : new Set<string>()),
    [barras, dependencias, destacarCadeia]
  );
  const porSucessor = useMemo(() => {
    const mapa = new Map<string, Dependencia[]>();
    for (const dep of dependencias) {
      const lista = mapa.get(dep.sucessorId) ?? [];
      lista.push(dep);
      mapa.set(dep.sucessorId, lista);
    }
    return mapa;
  }, [dependencias]);

  // Ciclo é o único estado em que o cronograma não existe. Desenhar barras
  // arbitrárias seria pior que dizer o que está errado.
  if (ciclo) {
    return (
      <p className="pipeline-erro" role="alert">
        As dependências formam um ciclo — uma tarefa depende, no fim das contas, dela mesma. Enquanto isso não for
        desfeito, não há cronograma a calcular. Abra a tarefa e remova a ligação que fecha o laço.
      </p>
    );
  }

  if (barras.length === 0) {
    return <p className="pipeline-coluna-vazia">Nenhuma tarefa com prazo neste projeto.</p>;
  }

  const primeiro = Math.min(...barras.map(b => paraDia(b.inicio)));
  const ultimo = Math.max(...barras.map(b => paraDia(b.termino)));
  const diaDeHoje = paraDia(hoje);
  const inicioEscala = Math.min(primeiro, diaDeHoje) - 1;
  const fimEscala = Math.max(ultimo, diaDeHoje) + 1;
  const dias = Array.from({ length: fimEscala - inicioEscala + 1 }, (_, i) => inicioEscala + i);
  const posicaoY = new Map(barras.map((b, i) => [b.id, i]));

  return (
    <div className="gantt">
      <div className="gantt-controles">
        <label className="gantt-alternar">
          <input type="checkbox" checked={destacarCadeia} onChange={e => setDestacarCadeia(e.target.checked)} />
          <span>Destacar a cadeia que empurra a entrega</span>
        </label>
        {/* Duração do cronograma calculado, não a largura da escala — a escala
            estica para incluir a linha de hoje, e mostrar esse número ao lado
            do prazo do projeto colocava dois "dias programados" diferentes na
            mesma tela. */}
        <span className="pipeline-contagem">
          {barras.length} {barras.length === 1 ? "tarefa" : "tarefas"} · {ultimo - primeiro + 1} dias entre o primeiro
          início e o último término
        </span>
      </div>

      <div className="gantt-quadro">
        <div className="gantt-nomes">
          <div className="gantt-cabecalho-vazio" aria-hidden="true" />
          {barras.map(barra => (
            <div
              key={barra.id}
              className={cadeia.has(barra.id) ? "gantt-nome critica" : "gantt-nome"}
              title={barra.titulo}
            >
              <strong>{barra.titulo}</strong>
              <small>
                {barra.duracaoDias} {barra.duracaoDias === 1 ? "dia" : "dias"}
                {(porSucessor.get(barra.id) ?? []).map(dep => (
                  <span key={`${dep.predecessorId}-${dep.tipo}`} className="gantt-sigla" title={ROTULO_DEPENDENCIA[dep.tipo]}>
                    {SIGLA_PT[dep.tipo]}
                    {dep.folgaDias !== 0 ? (dep.folgaDias > 0 ? `+${dep.folgaDias}` : dep.folgaDias) : ""}
                  </span>
                ))}
              </small>
            </div>
          ))}
        </div>

        <div className="gantt-rolagem">
          <div className="gantt-grade" style={{ width: dias.length * LARGURA_DIA }}>
            <div className="gantt-escala">
              {dias.map(dia => {
                const { texto, mes, fimDeSemana } = rotuloDia(dia);
                return (
                  <div
                    key={dia}
                    className={fimDeSemana ? "gantt-dia fim-de-semana" : "gantt-dia"}
                    style={{ width: LARGURA_DIA }}
                  >
                    <span>{texto}</span>
                    {texto === "01" ? <small>{mes}</small> : null}
                  </div>
                );
              })}
            </div>

            {/* Linha do dia: sem ela, "atrasado" é conclusão de quem conta no dedo. */}
            <div
              className="gantt-hoje"
              style={{ left: (diaDeHoje - inicioEscala) * LARGURA_DIA }}
              aria-hidden="true"
            />

            <div className="gantt-linhas">
              {barras.map(barra => {
                const inicio = paraDia(barra.inicio) - inicioEscala;
                const largura = (paraDia(barra.termino) - paraDia(barra.inicio) + 1) * LARGURA_DIA;
                const atrasada = paraDia(barra.termino) < diaDeHoje && barra.progresso < 1;
                return (
                  <div className="gantt-linha" key={barra.id} style={{ height: 44 }}>
                    <div
                      className={[
                        "gantt-barra",
                        cadeia.has(barra.id) ? "critica" : "",
                        atrasada ? "atrasada" : "",
                        barra.derivada ? "derivada" : ""
                      ].filter(Boolean).join(" ")}
                      style={{ left: inicio * LARGURA_DIA, width: largura }}
                      title={`${barra.titulo}: ${barra.inicio} a ${barra.termino}${barra.derivada ? " (data vinda da dependência)" : ""}`}
                    >
                      <span className="gantt-progresso" style={{ width: `${Math.round(barra.progresso * 100)}%` }} />
                      <span className="gantt-barra-rotulo">{Math.round(barra.progresso * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Setas de dependência, desenhadas por cima das barras. */}
            <svg className="gantt-ligacoes" width={dias.length * LARGURA_DIA} height={barras.length * 44} aria-hidden="true">
              {dependencias.map(dep => {
                const de = barras.find(b => b.id === dep.predecessorId);
                const para = barras.find(b => b.id === dep.sucessorId);
                const linhaDe = posicaoY.get(dep.predecessorId);
                const linhaPara = posicaoY.get(dep.sucessorId);
                if (!de || !para || linhaDe === undefined || linhaPara === undefined) return null;

                const saiDoFim = dep.tipo === "FS" || dep.tipo === "FF";
                const chegaNoFim = dep.tipo === "FF" || dep.tipo === "SF";
                const x1 = ((saiDoFim ? paraDia(de.termino) + 1 : paraDia(de.inicio)) - inicioEscala) * LARGURA_DIA;
                const x2 = ((chegaNoFim ? paraDia(para.termino) + 1 : paraDia(para.inicio)) - inicioEscala) * LARGURA_DIA;
                const y1 = linhaDe * 44 + 22;
                const y2 = linhaPara * 44 + 22;
                const meio = Math.max(x1, x2) + 8;
                const critica = cadeia.has(dep.predecessorId) && cadeia.has(dep.sucessorId);

                return (
                  <path
                    key={`${dep.predecessorId}-${dep.sucessorId}-${dep.tipo}`}
                    d={`M ${x1} ${y1} H ${meio} V ${y2} H ${x2}`}
                    className={critica ? "gantt-ligacao critica" : "gantt-ligacao"}
                    fill="none"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
