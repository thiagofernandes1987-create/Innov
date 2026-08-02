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
import "./project-creation.css";

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

  // `data-scroll-behavior` declara que o `scroll-behavior: smooth` do CSS é
  // intencional. Sem ele o Next avisa no console de TODA página, e aviso
  // recorrente que ninguém vai tratar ensina a ignorar o console — que é
  // justamente onde o defeito seguinte vai aparecer.
  return (
    <html lang="pt-BR" data-tema={tema} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
