export type ModuleCapabilityKey =
  | "create" | "read" | "update" | "delete" | "approve"
  | "release_to_client" | "sign" | "export" | "manage"
  | "view_sensitive_financials" | "assign_users" | "configure";

export type ModuleAccessLevel = "NONE" | "READ" | "READ_WRITE" | "FULL";

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
  { key:"clients", name:"Clientes", description:"Cadastro de clientes e visão multiobra.", icon:"♙", category:"Comercial", routePrefix:"/app/clientes", sortOrder:20 },
  { key:"works", name:"Obras", description:"Carteira multiobra e progresso executivo.", icon:"▦", category:"Operacional", routePrefix:"/app/obras", sortOrder:30, dependencies:["clients"] },
  { key:"planning", name:"Planejamento", description:"EAP, cronogramas, marcos e baselines.", icon:"◫", category:"Operacional", routePrefix:"/app/planejamento", sortOrder:40, dependencies:["works"] },
  { key:"tasks", name:"Tarefas", description:"Quadros de execução e responsabilidades.", icon:"✓", category:"Operacional", routePrefix:"/app/tarefas", sortOrder:50, dependencies:["works"] },
  { key:"daily", name:"Diário de Obras", description:"Registros, atividades e evidências de campo.", icon:"▤", category:"Operacional", routePrefix:"/app/diario", sortOrder:60, dependencies:["works"] },
  { key:"teams", name:"Equipes", description:"Equipes, integrantes e recursos.", icon:"♟", category:"Operacional", routePrefix:"/app/equipes", sortOrder:70, dependencies:["works"] },
  { key:"budgets", name:"Orçamentos", description:"Custos, BDI, markup, cenários e aprovações.", icon:"∑", category:"Financeiro", routePrefix:"/app/orcamentos", sortOrder:80, dependencies:["clients"] },
  { key:"proposals", name:"Propostas", description:"Propostas comerciais e versões liberadas.", icon:"▧", category:"Comercial", routePrefix:"/app/propostas", sortOrder:90, dependencies:["budgets"] },
  { key:"contracts", name:"Contratos", description:"Contratos, partes, versões e vigência.", icon:"§", category:"Jurídico", routePrefix:"/app/contratos", sortOrder:100, dependencies:["proposals"] },
  { key:"addenda", name:"Aditivos", description:"Alterações de valor, escopo e prazo.", icon:"＋", category:"Jurídico", routePrefix:"/app/aditivos", sortOrder:110, dependencies:["contracts"] },
  { key:"signatures", name:"Assinaturas", description:"Envelopes, signatários e evidências.", icon:"✎", category:"Jurídico", routePrefix:"/app/assinaturas", sortOrder:120, dependencies:["documents"] },
  { key:"documents", name:"Documentos", description:"Arquivos privados, versões e liberações.", icon:"□", category:"Operacional", routePrefix:"/app/documentos", sortOrder:130 },
  { key:"quality", name:"Qualidade", description:"PO, FVS, FVM e não conformidades.", icon:"◇", category:"Qualidade", routePrefix:"/app/qualidade", sortOrder:140, dependencies:["works"] },
  { key:"purchases", name:"Compras", description:"Solicitações, cotações e pedidos.", icon:"◉", category:"Suprimentos", routePrefix:"/app/compras", sortOrder:150 },
  { key:"inventory", name:"Estoque", description:"Entradas, saídas e inventários.", icon:"▣", category:"Suprimentos", routePrefix:"/app/estoque", sortOrder:160, dependencies:["purchases"] },
  { key:"finance", name:"Financeiro", description:"Contas, fluxo de caixa e conciliação.", icon:"$", category:"Financeiro", routePrefix:"/app/financeiro", sortOrder:170 },
  { key:"service", name:"Pós-venda e SAC", description:"Ocorrências e prestação de serviços.", icon:"◌", category:"Pós-venda", routePrefix:"/app/ocorrencias", sortOrder:180, dependencies:["clients"] },
  { key:"audit", name:"Auditoria", description:"Eventos de segurança e alterações.", icon:"↺", category:"Núcleo", routePrefix:"/app/auditoria", sortOrder:190, system:true },
  { key:"administration", name:"Administração", description:"Aplicativos, perfis e usuários.", icon:"⚙", category:"Núcleo", routePrefix:"/app/administracao", sortOrder:200, system:true }
] as const;

export const MODULE_BY_KEY = new Map(MODULE_REGISTRY.map(module => [module.key, module]));

export function moduleForPath(pathname: string): ModuleManifest | undefined {
  return [...MODULE_REGISTRY]
    .filter(module => module.key !== "dashboard" && (pathname === module.routePrefix || pathname.startsWith(`${module.routePrefix}/`)))
    .sort((a,b) => b.routePrefix.length - a.routePrefix.length)[0];
}

export function capabilitiesForLevel(level: ModuleAccessLevel): ModuleCapabilityKey[] {
  if (level === "READ") return ["read"];
  if (level === "READ_WRITE") return ["create","read","update","export"];
  if (level === "FULL") return ["create","read","update","delete","approve","release_to_client","sign","export","manage","view_sensitive_financials","assign_users","configure"];
  return [];
}
