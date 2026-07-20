import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="documentos">{children}</ModuleAccessLayout>;
}
