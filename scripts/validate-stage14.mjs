import fs from "node:fs";

const files=[
  "supabase/migrations/20260720103000_stage14_procurement_schema.sql",
  "supabase/migrations/20260720103100_stage14_procurement_security.sql",
  "supabase/migrations/20260720103200_stage14_procurement_module.sql",
  "app/actions/procurement.ts",
  "lib/procurement/comparison.ts",
  "lib/procurement/comparison.test.ts",
  "components/procurement/request-items-builder.tsx",
  "components/procurement/supplier-quote-form.tsx",
  "components/procurement/receipt-form.tsx",
  "app/app/compras/page.tsx",
  "app/app/compras/solicitacoes/page.tsx",
  "app/app/compras/solicitacoes/nova/page.tsx",
  "app/app/compras/solicitacoes/[id]/page.tsx",
  "app/app/compras/fornecedores/page.tsx",
  "app/app/compras/pedidos/page.tsx",
  "app/app/compras/pedidos/[id]/page.tsx",
  "app/fornecedores/cotacoes/[token]/page.tsx",
  "app/api/compras/cotacoes/[id]/anexo/route.ts",
  "app/procurement.css"
];
const errors=[];
for(const file of files)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
const schema=fs.readFileSync(files[0],"utf8");
for(const table of ["procurement_suppliers","procurement_requests","procurement_request_items","procurement_rfqs","procurement_supplier_invitations","procurement_quotes","procurement_quote_items","procurement_approvals","procurement_orders","procurement_order_items","procurement_receipts","procurement_receipt_items","procurement_receipt_quality","procurement_events"]){if(!schema.includes(`public.${table}`))errors.push(`Tabela ausente: ${table}`);}
for(const token of ["procurement-attachments","token_sha256","quality_form_assignments","quality_form_responses"])if(!schema.includes(token))errors.push(`Schema incompleto: ${token}`);
const security=fs.readFileSync(files[1],"utf8");
for(const token of ["enable row level security","submit_procurement_request","open_procurement_rfq","finalize_procurement_quote","select_procurement_quote","decide_procurement_approval","finalize_procurement_receipt","has_module_permission","service_role"])if(!security.includes(token))errors.push(`Segurança/transação incompleta: ${token}`);
const moduleSeed=fs.readFileSync(files[2],"utf8");
for(const token of ["app_modules","organization_modules","profile_module_permissions","supplierPublicSignup","inventoryEnabled","default_enabled=false"])if(!moduleSeed.includes(token))errors.push(`Módulo incompleto: ${token}`);
const actions=fs.readFileSync(files[3],"utf8");
for(const action of ["createProcurementSupplier","createProcurementRequest","submitProcurementRequest","createProcurementRfq","inviteProcurementSupplier","openProcurementRfq","submitSupplierProcurementQuote","selectProcurementQuote","decideProcurementApproval","createProcurementReceipt"])if(!actions.includes(`function ${action}`))errors.push(`Ação ausente: ${action}`);
const comparison=fs.readFileSync(files[4],"utf8");
for(const token of ["compareProcurementQuotes","priceScore","leadTimeScore","coverageScore","finalScore"])if(!comparison.includes(token))errors.push(`Mapa comparativo incompleto: ${token}`);
if(errors.length){console.error(`Etapa 14 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 14 validada: ${files.length} arquivos críticos, 14 tabelas, RLS, fornecedores por convite, mapa comparativo, aprovação, pedido, recebimento e FVM.`);
