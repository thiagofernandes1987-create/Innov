import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buscarCEP } from "@/lib/validacao/cep";

// Ponte entre o campo de CEP e o serviço de endereço.
//
// A consulta acontece aqui, no servidor, e não no navegador: a CSP aplicada
// restringe `connect-src` a `'self'` e ao storage do Supabase. Sem esta rota,
// preencher endereço por CEP exigiria afrouxar a política de segurança inteira
// por causa de um campo de formulário.
//
// Exige sessão: é rota interna de cadastro, não serviço público de consulta.

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ cep: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ encontrado: false, erro: "Sessão expirada." }, { status: 401 });
  }

  const { cep } = await params;
  const resultado = await buscarCEP(cep);

  // Serviço indisponível não é erro do cliente: responde 200 com o motivo, para
  // o campo apenas informar e seguir. Endereço é conveniência, não bloqueio.
  return NextResponse.json(resultado, {
    status: 200,
    headers: { "cache-control": "private, max-age=3600" }
  });
}
