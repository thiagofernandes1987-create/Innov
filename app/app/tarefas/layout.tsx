import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="tarefas">{children}</ModuleAccessLayout>;
}
