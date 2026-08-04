import type { Icon } from "@phosphor-icons/react";
import {
  Buildings,
  Calculator,
  ChartBar,
  CheckSquare,
  ClipboardText,
  ClockCounterClockwise,
  Cube,
  CurrencyDollar,
  File,
  FileLock,
  FilePlus,
  Files,
  FolderOpen,
  Funnel,
  GearSix,
  Headset,
  House,
  Kanban,
  ListChecks,
  Package,
  PenNib,
  ShieldCheck,
  ShoppingCart,
  Signature,
  SlidersHorizontal,
  Users,
  UsersThree
} from "@phosphor-icons/react";

// Ícones vêm de uma única família visual. Assim o desenho deixa de variar por
// implementação e a casca, o launcher e os módulos compartilham peso, cantos e
// proporções.
const ICONES: Record<string, Icon> = {
  dashboard: House,
  crm: Funnel,
  pipeline: Kanban,
  clientes: UsersThree,
  propostas: File,
  obras: Buildings,
  planejamento: ListChecks,
  tarefas: CheckSquare,
  diario: ClipboardText,
  equipes: Users,
  documentos: FolderOpen,
  qualidade: ShieldCheck,
  orcamentos: Calculator,
  financeiro: CurrencyDollar,
  compras: ShoppingCart,
  estoque: Package,
  contratos: FileLock,
  assinaturas: Signature,
  aditivos: FilePlus,
  sac: Headset,
  relatorios: ChartBar,
  auditoria: ClockCounterClockwise,
  administracao: SlidersHorizontal,
  ativos: Cube
};

export function IconeDoModulo({
  chave,
  className,
  tamanho = 24
}: {
  chave: string;
  className?: string;
  tamanho?: number;
}) {
  const Componente = ICONES[chave] ?? Files;
  return <Componente size={tamanho} weight="regular" className={className} aria-hidden="true" />;
}

export function IconeEngrenagem({ tamanho = 17 }: { tamanho?: number }) {
  return <GearSix size={tamanho} weight="regular" aria-hidden="true" />;
}

export function IconeEditar({ tamanho = 17 }: { tamanho?: number }) {
  return <PenNib size={tamanho} weight="regular" aria-hidden="true" />;
}

export function temIconeProprio(chave: string): boolean {
  return chave in ICONES;
}

export const CHAVES_COM_ICONE = Object.keys(ICONES);

export const COR_DO_MODULO: Record<string, string> = {
  dashboard: "#4f8bd7",
  crm: "#4b79d8",
  pipeline: "#3d8fd1",
  clientes: "#17a39a",
  propostas: "#4b88e7",
  obras: "#438bd1",
  planejamento: "#9d4aa3",
  tarefas: "#d49424",
  diario: "#b96531",
  equipes: "#2aa47f",
  orcamentos: "#74a94b",
  financeiro: "#4a9a76",
  compras: "#bf6f32",
  estoque: "#9f8840",
  contratos: "#865ab0",
  aditivos: "#9467ba",
  assinaturas: "#b65d91",
  documentos: "#4a78a9",
  qualidade: "#b4872b",
  sac: "#c06060",
  relatorios: "#596fbd",
  auditoria: "#7b8492",
  administracao: "#6c7482",
  ativos: "#6d91b9"
};

const COR_PADRAO = "#6d91b9";

export function corDoModulo(chave: string): string {
  return COR_DO_MODULO[chave] ?? COR_PADRAO;
}
