import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="obras">{children}</ModuleAccessLayout>;
}
