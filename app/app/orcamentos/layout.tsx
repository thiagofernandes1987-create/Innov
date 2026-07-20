import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function BudgetsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="orcamentos">{children}</ModuleAccessLayout>;
}
