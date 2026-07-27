"use server";

import { cookies } from "next/headers";
import { COOKIE_VISTO_ATIVIDADES, COOKIE_VISTO_MENSAGENS } from "@/lib/casca/avisos";

// Marcar como visto é gravar um instante, não uma linha por item.
//
// O cookie é `httpOnly`: quem lê o valor é o servidor, ao montar a barra. Sem
// isso qualquer script na página conseguiria zerar o aviso de outra pessoa.

const UM_ANO = 60 * 60 * 24 * 365;

export async function marcarVisto(painel: "mensagens" | "atividades"): Promise<void> {
  const jar = await cookies();
  jar.set(painel === "mensagens" ? COOKIE_VISTO_MENSAGENS : COOKIE_VISTO_ATIVIDADES, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UM_ANO
  });
}
