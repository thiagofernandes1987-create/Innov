import { ModuleAccessLayout } from "@/components/module-access-layout";

export default function AmendmentsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleAccessLayout moduleKey="aditivos">{children}</ModuleAccessLayout>;
}
