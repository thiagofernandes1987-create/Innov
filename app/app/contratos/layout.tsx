import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="contratos">{children}</ModuleAccessLayout>;
}
