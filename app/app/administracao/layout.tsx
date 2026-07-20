import { requireModulePermission } from "@/lib/auth";

export default async function AdministrationLayout({ children }: { children: React.ReactNode }) {
  await requireModulePermission("administracao", "READ", { action: "administer" });
  return children;
}
