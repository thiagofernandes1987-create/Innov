"use server";

import { redirect } from "next/navigation";
import {
  dadosSegurosDoErroDeLogin,
  mensagemPublicaDeErroDeLogin
} from "@/lib/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/app/orcamentos");
  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/app/orcamentos";

  let error: unknown = null;

  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.signInWithPassword({ email, password });
    error = result.error;
  } catch (cause) {
    error = cause;
  }

  if (error) {
    console.error(JSON.stringify({
      event: "auth.sign_in.failed",
      ...dadosSegurosDoErroDeLogin(error)
    }));
    redirect(`/login?error=${encodeURIComponent(mensagemPublicaDeErroDeLogin(error))}`);
  }

  redirect(safeRedirect);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
