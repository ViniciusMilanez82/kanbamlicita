import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

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

  // Go/No-Go gate: bloqueia movimentação para colunas de proposta/documentação
  const nomeDestinoLC = colunaDestino.nome.toLowerCase();
  const ehColunaPropostaDoc = nomeDestinoLC.includes("proposta") || nomeDestinoLC.includes("documentação") || nomeDestinoLC.includes("documentacao");

  if (ehColunaPropostaDoc) {
    const decisao = await db.decisaoGoNoGo.findUnique({
      where: { licitacaoId: card.licitacaoId },
    });

    if (!decisao) {
      return NextResponse.json(
        { error: "É necessário registrar uma decisão de avançar ou não (Go/No-Go) na aba Habilitação antes de mover para esta etapa." },
        { status: 400 }
      );
    }

    if (decisao.decisao === "no_go") {
      return NextResponse.json(
        { error: "Esta licitação foi marcada como 'Não avançar'. Altere a decisão na aba Habilitação se quiser prosseguir." },
        { status: 400 }
      );
    }
  }

  const u = await db.user.findUnique({
    where: { id: auth.userId },
    select: { name: true },
  });

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
        movidoPor: u?.name ?? auth.userId,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
