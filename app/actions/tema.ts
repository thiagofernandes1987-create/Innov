"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";

// Preferência de tema, gravada em cookie e não em `localStorage`: o servidor
// precisa saber o tema antes de mandar o HTML. Com `localStorage` a página
// nasce clara e escurece depois que o JavaScript roda — o piscar branco que
// todo mundo reconhece e ninguém gosta.

export async function definirTema(tema: string) {
  const jar = await cookies();
  jar.set(COOKIE_TEMA, temaValido(tema), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });
  revalidatePath("/", "layout");
}
