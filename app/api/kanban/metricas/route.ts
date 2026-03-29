import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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
