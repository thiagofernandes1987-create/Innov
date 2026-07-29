import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import "./globals.css";
import "./stage12.css";
import "./signatures.css";
import "./quality.css";
import "./procurement.css";
import "./finance-operational.css";
import "./reports.css";
import "./inventory.css";
import "./relationship.css";
import "./observability.css";
import "./stage20.css";
import "./modern-workflows.css";

export const metadata: Metadata = {
  title: {
    default: "Innovar Construções e Reformas",
    template: "%s | Innovar"
  },
  description: "Plataforma digital da Innovar Construções e Reformas em Campos do Jordão."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // O tema vem do cookie e já vai no HTML servido. É o que evita a página
  // nascer clara e escurecer depois — o piscar branco de quem resolve isso
  // só no cliente.
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <html lang="pt-BR" data-tema={tema}>
      <body>{children}</body>
    </html>
  );
}
