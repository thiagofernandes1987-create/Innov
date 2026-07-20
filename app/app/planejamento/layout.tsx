import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="planejamento">{children}</ModuleAccessLayout>;
}
