import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tabela = searchParams.get("tabela");
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  const registroId = searchParams.get("registroId");

  const where: Record<string, unknown> = {};
  if (tabela) where.tabela = tabela;
  if (registroId) where.registroId = registroId;
  if (de || ate) {
    where.criadoEm = {};
    if (de) (where.criadoEm as Record<string, unknown>).gte = new Date(de);
    if (ate) (where.criadoEm as Record<string, unknown>).lte = new Date(ate);
  }

  const registros = await db.auditoriaParametro.findMany({
    where,
    include: {
      alteradoPor: { select: { name: true, email: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const resultado = registros.map((r) => ({
    ...r,
    alteradoPorNome: r.alteradoPor.name ?? r.alteradoPor.email,
  }));

  return NextResponse.json(resultado);
}
