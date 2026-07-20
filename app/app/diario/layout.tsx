import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function DailyLogsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="diario">{children}</ModuleAccessLayout>;
}
