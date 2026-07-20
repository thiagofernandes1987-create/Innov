import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function ProposalsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="propostas">{children}</ModuleAccessLayout>;
}
