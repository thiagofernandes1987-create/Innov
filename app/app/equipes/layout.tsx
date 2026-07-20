import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="equipes">{children}</ModuleAccessLayout>;
}
