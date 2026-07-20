export type ModuleCapabilityKey =
  | "create" | "read" | "update" | "delete" | "approve"
  | "release_to_client" | "sign" | "export" | "manage"
  | "view_sensitive_financials" | "assign_users" | "configure";

export type ModuleAccessLevel = "NONE" | "READ" | "READ_WRITE" | "FULL";
export type DatabaseAccessLevel = "NONE" | "READ" | "EDIT" | "DELETE";

export type ModuleManifest = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  routePrefix: string;
  sortOrder: number;
  dependencies?: string[];
  system?: boolean;
};

export const MODULE_REGISTRY: readonly ModuleManifest[] = [
  { key:"dashboard", name:"Início", description:"Central dos aplicativos autorizados.", icon:"⌂", category:"Núcleo", routePrefix:"/app", sortOrder:1, system:true },
  { key:"crm", name:"CRM e Vendas", description:"Leads, oportunidades e pipeline comercial.", icon:"◎", category:"Comercial", routePrefix:"/app/crm", sortOrder:10 },
  { key:"clientes", name:"Clientes", description:"Cadastro de clientes e visão multiobra.", icon:"♙", category:"Comercial", routePrefix:"/app/clientes", sortOrder:20 },
  { key:"obras", name:"Obras", description:"Carteira multiobra e progresso executivo.", icon:"▦", category:"Operacional", routePrefix:"/app/obras", sortOrder:30, dependencies:["clientes"] },
  { key:"planejamento", name:"Planejamento", description:"EAP, cronogramas, marcos e baselines.", icon:"◫", category:"Operacional", routePrefix:"/app/planejamento", sortOrder:40, dependencies:["obras"] },
  { key:"tarefas", name:"Tarefas", description:"Quadros de execução e responsabilidades.", icon:"✓", category:"Operacional", routePrefix:"/app/tarefas", sortOrder:50, dependencies:["obras"] },
  { key:"diario", name:"Diário de Obras", description:"Registros, atividades e evidências de campo.", icon:"▤", category:"Operacional", routePrefix:"/app/diario", sortOrder:60, dependencies:["obras"] },
  { key:"equipes", name:"Equipes", description:"Equipes, integrantes e recursos.", icon:"♟", category:"Operacional", routePrefix:"/app/equipes", sortOrder:70, dependencies:["obras"] },
  { key:"orcamentos", name:"Orçamentos", description:"Custos, BDI, markup, cenários e aprovações.", icon:"∑", category:"Financeiro", routePrefix:"/app/orcamentos", sortOrder:80, dependencies:["clientes"] },
  { key:"propostas", name:"Propostas", description:"Propostas comerciais e versões liberadas.", icon:"▧", category:"Comercial", routePrefix:"/app/propostas", sortOrder:90, dependencies:["orcamentos"] },
  { key:"contratos", name:"Contratos", description:"Contratos, partes, versões e vigência.", icon:"§", category:"Jurídico", routePrefix:"/app/contratos", sortOrder:100, dependencies:["propostas"] },
  { key:"aditivos", name:"Aditivos", description:"Alterações de valor, escopo e prazo.", icon:"＋", category:"Jurídico", routePrefix:"/app/aditivos", sortOrder:110, dependencies:["contratos"] },
  { key:"assinaturas", name:"Assinaturas", description:"Envelopes, signatários e evidências.", icon:"✎", category:"Jurídico", routePrefix:"/app/assinaturas", sortOrder:120, dependencies:["documentos"] },
  { key:"documentos", name:"Documentos", description:"Arquivos privados, versões e liberações.", icon:"□", category:"Operacional", routePrefix:"/app/documentos", sortOrder:130 },
  { key:"qualidade", name:"Qualidade", description:"PO, FVS, FVM e não conformidades.", icon:"◇", category:"Qualidade", routePrefix:"/app/qualidade", sortOrder:140, dependencies:["obras"] },
  { key:"compras", name:"Compras e Suprimentos", description:"Solicitações, cotações, aprovações, pedidos e recebimentos.", icon:"◉", category:"Suprimentos", routePrefix:"/app/compras", sortOrder:150, dependencies:["obras","qualidade"] },
  { key:"estoque", name:"Estoque", description:"Entradas, saídas e inventários.", icon:"▣", category:"Suprimentos", routePrefix:"/app/estoque", sortOrder:160, dependencies:["compras"] },
  { key:"financeiro", name:"Financeiro", description:"Contas, fluxo de caixa e conciliação.", icon:"$", category:"Financeiro", routePrefix:"/app/financeiro", sortOrder:170 },
  { key:"sac", name:"Pós-venda e SAC", description:"Ocorrências e prestação de serviços.", icon:"◌", category:"Pós-venda", routePrefix:"/app/ocorrencias", sortOrder:180, dependencies:["clientes"] },
  { key:"relatorios", name:"Relatórios", description:"Indicadores e análises autorizadas.", icon:"▥", category:"Geral", routePrefix:"/app/relatorios", sortOrder:190 },
  { key:"auditoria", name:"Auditoria", description:"Eventos de segurança e alterações.", icon:"↺", category:"Núcleo", routePrefix:"/app/auditoria", sortOrder:200, system:true },
  { key:"administracao", name:"Administração", description:"Aplicativos, perfis e usuários.", icon:"⚙", category:"Núcleo", routePrefix:"/app/administracao", sortOrder:210, system:true }
] as const;

export const MODULE_BY_KEY = new Map(MODULE_REGISTRY.map(item => [item.key, item]));

export function moduleForPath(pathname: string): ModuleManifest | undefined {
  return [...MODULE_REGISTRY]
    .filter(item => item.key !== "dashboard" && (pathname === item.routePrefix || pathname.startsWith(`${item.routePrefix}/`)))
    .sort((a,b) => b.routePrefix.length - a.routePrefix.length)[0];
}

export function toUiAccessLevel(level: DatabaseAccessLevel | string): ModuleAccessLevel {
  if (level === "DELETE") return "FULL";
  if (level === "EDIT") return "READ_WRITE";
  if (level === "READ") return "READ";
  return "NONE";
}

export function toDatabaseAccessLevel(level: ModuleAccessLevel): DatabaseAccessLevel {
  if (level === "FULL") return "DELETE";
  if (level === "READ_WRITE") return "EDIT";
  if (level === "READ") return "READ";
  return "NONE";
}

export function capabilitiesForLevel(level: ModuleAccessLevel): ModuleCapabilityKey[] {
  if (level === "READ") return ["read"];
  if (level === "READ_WRITE") return ["create","read","update","export"];
  if (level === "FULL") return ["create","read","update","delete","approve","release_to_client","sign","export","manage","view_sensitive_financials","assign_users","configure"];
  return [];
}
