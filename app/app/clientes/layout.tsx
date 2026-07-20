import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="clientes">{children}</ModuleAccessLayout>;
}
