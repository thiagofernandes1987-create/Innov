import { requireModulePermission } from "@/lib/auth";

export async function ModuleAccessLayout({
  moduleKey,
  children
}: {
  moduleKey: string;
  children: React.ReactNode;
}) {
  await requireModulePermission(moduleKey, "READ");
  return children;
}
