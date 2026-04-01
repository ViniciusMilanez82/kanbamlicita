import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { analisarComIa } from "@/lib/score/analise-ia";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  // Verificar se já está processando
  const existente = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });
  if (existente?.status === "processando") {
    return NextResponse.json(
      { error: "Análise IA já está em andamento" },
      { status: 409 }
    );
  }

  // Executar em background
  analisarComIa(id).catch((err) => {
    console.error(`[analise-ia] Erro na análise da licitação ${id}:`, err);
  });

  return NextResponse.json({ status: "processando" }, { status: 202 });
}
