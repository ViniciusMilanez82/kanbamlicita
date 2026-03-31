import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { executarCaptacao } from "@/lib/fontes/pipeline";

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

  const fonte = await db.fonteCaptacao.findUnique({ where: { id } });
  if (!fonte) {
    return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
  }
  if (!fonte.ativo) {
    return NextResponse.json({ error: "Fonte inativa" }, { status: 400 });
  }

  // Verificar se já tem execução em andamento
  const emAndamento = await db.execucaoCaptacao.findFirst({
    where: { fonteId: id, status: "executando" },
  });
  if (emAndamento) {
    return NextResponse.json(
      { error: "Já existe uma execução em andamento para esta fonte" },
      { status: 409 }
    );
  }

  const disparadoPor = auth.userId;
  const resultado = await executarCaptacao(id, disparadoPor);

  return NextResponse.json(resultado, { status: 202 });
}
