import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  const urgentes = await db.kanbanCard.count({ where: { urgente: true } });
  const total = await db.kanbanCard.count();

  return NextResponse.json({
    total,
    urgentes,
    porColuna: colunas.map((c) => ({
      colunaId: c.id,
      colunaNome: c.nome,
      count: c._count.cards,
    })),
  });
}
