import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { cardId, colunaDestinoId, motivo } = body;

  if (!cardId || !colunaDestinoId) {
    return NextResponse.json({ error: "cardId e colunaDestinoId são obrigatórios" }, { status: 400 });
  }

  const card = await db.kanbanCard.findUnique({
    where: { id: cardId },
    include: { coluna: true },
  });

  if (!card) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const colunaDestino = await db.kanbanColuna.findUnique({ where: { id: colunaDestinoId } });
  if (!colunaDestino) return NextResponse.json({ error: "Coluna destino não encontrada" }, { status: 404 });

  if (colunaDestino.tipo === "final_negativo" && !motivo) {
    return NextResponse.json({ error: "Motivo é obrigatório para esta coluna" }, { status: 400 });
  }

  const user = session.user as { id: string; name?: string | null };

  const [updated] = await db.$transaction([
    db.kanbanCard.update({
      where: { id: cardId },
      data: { colunaId: colunaDestinoId },
      include: { coluna: true },
    }),
    db.movimentacao.create({
      data: {
        cardId,
        licitacaoId: card.licitacaoId,
        colunaOrigem: card.coluna.nome,
        colunaDestino: colunaDestino.nome,
        motivo,
        movidoPor: user.name ?? user.id,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
