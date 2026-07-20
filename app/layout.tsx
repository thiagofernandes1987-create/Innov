import type { Metadata } from "next";
import "./globals.css";
import "./stage12.css";
import "./signatures.css";
import "./quality.css";
import "./procurement.css";
import "./finance-operational.css";
import "./reports.css";

export const metadata: Metadata = {
  title: {
    default: "Innovar Construções e Reformas",
    template: "%s | Innovar"
  },
  description: "Plataforma digital da Innovar Construções e Reformas em Campos do Jordão."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
