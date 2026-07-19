import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Innovar Construções e Reformas",
    template: "%s | Innovar"
  },
  description: "Plataforma digital da Innovar Construções e Reformas em Campos do Jordão."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
