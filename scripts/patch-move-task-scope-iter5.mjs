import { readFile, writeFile } from "node:fs/promises";

const path = "app/actions/projects.ts";
let source = await readFile(path, "utf8");

const from = `  const { supabase } = await requireOrganizationContext(managementRoles);\n  const { error } = await supabase.rpc("move_project_task", {`;
const to = `  const { supabase, organizationId } = await requireOrganizationContext(managementRoles);\n  const { data: scopedTask, error: taskError } = await supabase\n    .from("project_tasks")\n    .select("id")\n    .eq("id", taskId)\n    .eq("project_id", projectId)\n    .eq("organization_id", organizationId)\n    .maybeSingle();\n  if (taskError) failProjectDatabase(path, "move-task.validate-scope", taskError, "Não foi possível validar a tarefa.");\n  if (!scopedTask) fail(path, "A tarefa não pertence a esta obra.");\n\n  const { error } = await supabase.rpc("move_project_task", {`;

const occurrences = source.split(from).length - 1;
if (occurrences !== 1) throw new Error(`Esperada uma ocorrência da RPC move_project_task; encontradas ${occurrences}.`);
source = source.replace(from, to);
await writeFile(path, source);
console.log("Escopo da movimentação de tarefa protegido.");
