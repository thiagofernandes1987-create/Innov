import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function SignaturesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="assinaturas">{children}</ModuleAccessLayout>;
}
