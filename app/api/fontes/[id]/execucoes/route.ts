import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limite = Math.min(50, Math.max(1, Number(searchParams.get("limite")) || 20));

  const execucoes = await db.execucaoCaptacao.findMany({
    where: { fonteId: id },
    orderBy: { iniciadaEm: "desc" },
    take: limite,
  });

  return NextResponse.json(execucoes);
}
