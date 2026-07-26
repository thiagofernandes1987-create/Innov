import type { ReactElement } from "react";

// Ícone de aplicativo, um por módulo.
//
// Antes eram glifos Unicode escolhidos por semelhança de forma: `♙` para
// Clientes, `∑` para Orçamentos, `◌` para SAC. Peão de xadrez não é cliente, e
// somatório não é orçamento — quem procura o módulo lê o rótulo e ignora o
// símbolo, que é o mesmo que não ter símbolo.
//
// Aqui é traço, não preenchimento: 24×24, `currentColor`, espessura 1.6. Um
// desenho só entra se representar a coisa, não a inicial dela.

const T = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

const DESENHOS: Record<string, ReactElement> = {
  // Início — a própria grade de aplicativos.
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" {...T} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" {...T} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" {...T} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" {...T} />
    </>
  ),
  // CRM — funil.
  crm: (
    <>
      <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" {...T} />
    </>
  ),
  // Clientes — pessoas.
  clientes: (
    <>
      <circle cx="9" cy="8" r="3.2" {...T} />
      <path d="M3 20a6 6 0 0 1 12 0" {...T} />
      <path d="M16.5 6.5a3 3 0 0 1 0 5.6" {...T} />
      <path d="M18 20a5.5 5.5 0 0 0-3-4.9" {...T} />
    </>
  ),
  // Obras/Projeto — edificação com pavimentos.
  obras: (
    <>
      <path d="M4 21V6.5L12 3l8 3.5V21" {...T} />
      <path d="M4 12h16M4 16.5h16" {...T} />
      <path d="M10 21v-4h4v4" {...T} />
    </>
  ),
  // Planejamento — barras em escala de tempo.
  planejamento: (
    <>
      <path d="M3 5h10M3 12h14M3 19h7" {...T} />
      <path d="M17 5h4M20 12h1M11 19h10" {...T} />
    </>
  ),
  // Tarefas — item marcado em lista.
  tarefas: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" {...T} />
      <path d="M8 12l2.5 2.5L16 9" {...T} />
    </>
  ),
  // Diário de campo — prancheta com linhas.
  diario: (
    <>
      <path d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16" {...T} />
      <rect x="8" y="2.5" width="8" height="3.5" rx="1.2" {...T} />
      <path d="M8.5 11h7M8.5 15h4.5" {...T} />
    </>
  ),
  // Equipes — grupo.
  equipes: (
    <>
      <circle cx="12" cy="7" r="3" {...T} />
      <circle cx="5.5" cy="10.5" r="2.2" {...T} />
      <circle cx="18.5" cy="10.5" r="2.2" {...T} />
      <path d="M7 20a5 5 0 0 1 10 0" {...T} />
      <path d="M2 18.5a4 4 0 0 1 3.5-3.4M22 18.5a4 4 0 0 0-3.5-3.4" {...T} />
    </>
  ),
  // Orçamentos — calculadora.
  orcamentos: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.5" {...T} />
      <path d="M8 7h8" {...T} />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" {...T} strokeWidth={2.2} />
    </>
  ),
  // Propostas — documento com valor.
  propostas: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" {...T} />
      <path d="M14 3v5h5" {...T} />
      <path d="M9 14h6M9 17.5h4" {...T} />
    </>
  ),
  // Contratos — documento assinado.
  contratos: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...T} />
      <path d="M14 3v5h4" {...T} />
      <path d="M9 17c1.6-3.2 3-3.2 4 0s2.4 1.6 3-.6" {...T} />
    </>
  ),
  // Aditivos — documento com acréscimo.
  aditivos: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" {...T} />
      <path d="M14 3v5h5" {...T} />
      <path d="M12 12.5v5M9.5 15h5" {...T} />
    </>
  ),
  // Assinaturas — caneta traçando.
  assinaturas: (
    <>
      <path d="M4 18c2.5 0 3-9 5.5-9S12 17 14 17s2.5-4 4-4 2 2 2 2" {...T} />
      <path d="M3.5 21h17" {...T} />
    </>
  ),
  // Documentos — pasta.
  documentos: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.5.7l1.1 1.3h7.2A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" {...T} />
    </>
  ),
  // Qualidade — escudo conferido.
  qualidade: (
    <>
      <path d="M12 3l7.5 3v6c0 4.6-3.1 8.2-7.5 9.5C7.6 20.2 4.5 16.6 4.5 12V6L12 3Z" {...T} />
      <path d="M8.8 12l2.3 2.3 4.1-4.4" {...T} />
    </>
  ),
  // Compras — carrinho.
  compras: (
    <>
      <path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L20.5 8H6" {...T} />
      <circle cx="10" cy="20" r="1.4" {...T} />
      <circle cx="17" cy="20" r="1.4" {...T} />
    </>
  ),
  // Estoque — caixa.
  estoque: (
    <>
      <path d="M3.5 8.5L12 4l8.5 4.5v7L12 20l-8.5-4.5v-7Z" {...T} />
      <path d="M3.5 8.5L12 13l8.5-4.5M12 13v7" {...T} />
    </>
  ),
  // Financeiro — nota e moeda.
  financeiro: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" {...T} />
      <circle cx="12" cy="12" r="2.6" {...T} />
      <path d="M6 10v4M18 10v4" {...T} />
    </>
  ),
  // SAC — atendimento.
  sac: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" {...T} />
      <rect x="2.5" y="13" width="4" height="6" rx="1.6" {...T} />
      <rect x="17.5" y="13" width="4" height="6" rx="1.6" {...T} />
      <path d="M19.5 19v.6a2.4 2.4 0 0 1-2.4 2.4H13" {...T} />
    </>
  ),
  // Relatórios — barras.
  relatorios: (
    <>
      <path d="M3.5 20h17" {...T} />
      <rect x="5" y="12" width="3.6" height="6" rx="1" {...T} />
      <rect x="10.2" y="7" width="3.6" height="11" rx="1" {...T} />
      <rect x="15.4" y="10" width="3.6" height="8" rx="1" {...T} />
    </>
  ),
  // Auditoria — histórico.
  auditoria: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" {...T} />
      <path d="M3.5 4.5V9H8" {...T} />
      <path d="M12 8v4.4l3 1.8" {...T} />
    </>
  ),
  // Administração — controles.
  administracao: (
    <>
      <path d="M5 6h14M5 12h14M5 18h14" {...T} />
      <circle cx="9" cy="6" r="2" {...T} />
      <circle cx="15" cy="12" r="2" {...T} />
      <circle cx="8" cy="18" r="2" {...T} />
    </>
  )
};

// Módulo sem desenho declarado não fica sem ícone: recebe um genérico, porque
// buraco na grade é pior que símbolo neutro.
const GENERICO: ReactElement = (
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" {...T} />
    <path d="M9 12h6" {...T} />
  </>
);

export function IconeDoModulo({ chave, className }: { chave: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {DESENHOS[chave] ?? GENERICO}
    </svg>
  );
}

export function temIconeProprio(chave: string): boolean {
  return chave in DESENHOS;
}

export const CHAVES_COM_ICONE = Object.keys(DESENHOS);
