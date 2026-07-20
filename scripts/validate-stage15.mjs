import fs from"node:fs";

const files=[
 "supabase/migrations/20260720123000_stage15_finance_schema.sql",
 "supabase/migrations/20260720123100_stage15_finance_security.sql",
 "supabase/migrations/20260720123200_stage15_finance_module.sql",
 "supabase/migrations/20260720123300_stage15_finance_hardening.sql",
 "supabase/migrations/20260720123400_stage15_finance_performance.sql",
 "supabase/migrations/20260720123500_stage15_finance_atomic_attachments.sql",
 "app/actions/operational-finance.ts",
 "lib/financial/cash-flow.ts",
 "lib/financial/cash-flow.test.ts",
 "components/finance/installments-builder.tsx",
 "components/finance/measurement-items-builder.tsx",
 "components/finance/settlement-form.tsx",
 "app/app/financeiro/page.tsx",
 "app/app/financeiro/lancamentos/page.tsx",
 "app/app/financeiro/lancamentos/novo/page.tsx",
 "app/app/financeiro/lancamentos/[id]/page.tsx",
 "app/app/financeiro/medicoes/page.tsx",
 "app/app/financeiro/medicoes/nova/page.tsx",
 "app/app/financeiro/medicoes/[id]/page.tsx",
 "app/app/financeiro/fluxo-de-caixa/page.tsx",
 "app/app/financeiro/configuracoes/page.tsx",
 "app/api/financeiro/anexos/[id]/route.ts",
 "app/finance-operational.css"
];
const errors=[];
for(const file of files)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
const schema=fs.readFileSync(files[0],"utf8");
for(const table of["finance_categories","finance_cost_centers","finance_cash_accounts","finance_measurements","finance_measurement_items","finance_entries","finance_installments","finance_approvals","finance_settlements","finance_attachments","finance_events"])if(!schema.includes(`public.${table}`))errors.push(`Tabela ausente: ${table}`);
for(const token of["finance_entry_balances_v","finance_cash_flow_monthly_v","period_month","finance-attachments","security_invoker=true","PROCUREMENT_ORDER","MEASUREMENT"])if(!schema.includes(token))errors.push(`Schema incompleto: ${token}`);
const security=fs.readFileSync(files[1],"utf8");
for(const token of["enable row level security","submit_finance_entry","decide_finance_approval","register_finance_settlement","create_finance_entry_from_procurement_order","create_finance_entry_from_contract","submit_finance_measurement","decide_finance_measurement","refresh_finance_overdue_statuses","has_module_permission","sensitive"])if(!security.includes(token))errors.push(`Segurança/transação incompleta: ${token}`);
const moduleSeed=fs.readFileSync(files[2],"utf8");
for(const token of["app_modules","organization_modules","profile_module_permissions","install_finance_defaults","organizations_install_finance_defaults","automaticBankReconciliation","openFinance","fiscalIssuance"])if(!moduleSeed.includes(token))errors.push(`Módulo incompleto: ${token}`);
const hardening=fs.readFileSync(files[3],"utf8");
for(const token of["finance_entry_status","finance_installment_status","validate_finance_measurement_links","validate_finance_entry_links","validate_finance_child_organization","finance_entries_validate_links"])if(!hardening.includes(token))errors.push(`Hardening incompleto: ${token}`);
const performance=fs.readFileSync(files[4],"utf8");
for(const token of["finance_measurements_contract_idx","finance_entries_supplier_idx","finance_events_entry_idx","finance_attachments_org_idx"])if(!performance.includes(token))errors.push(`Índice ausente: ${token}`);
const atomic=fs.readFileSync(files[5],"utf8");
for(const token of["register_finance_settlement_with_attachment","26214400","p_storage_path not like","finance_attachments"])if(!atomic.includes(token))errors.push(`Baixa atômica incompleta: ${token}`);
const actions=fs.readFileSync(files[6],"utf8");
for(const action of["createFinanceCategory","createFinanceCostCenter","createFinanceCashAccount","createFinanceEntry","submitFinanceEntry","decideFinanceApproval","registerFinanceSettlement","importProcurementOrderPayable","importContractReceivable","createFinanceMeasurement","submitFinanceMeasurement","decideFinanceMeasurement"])if(!actions.includes(`function ${action}`))errors.push(`Ação ausente: ${action}`);
for(const token of["register_finance_settlement_with_attachment","admin.storage","contract.project_id !== projectId"])if(!actions.includes(token))errors.push(`Ação sem hardening: ${token}`);
const engine=fs.readFileSync(files[7],"utf8");
for(const token of["summarizeCashFlow","cashFlowRisk","accumulatedPlanned","maximumCashRequirement"])if(!engine.includes(token))errors.push(`Motor de caixa incompleto: ${token}`);
if(errors.length){console.error(`Etapa 15 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 15 validada: ${files.length} arquivos críticos, 11 tabelas, duas visões, RLS, hardening multi-tenant, índices, anexos atômicos, aprovações, parcelas, liquidações, medições e fluxo de caixa.`);
