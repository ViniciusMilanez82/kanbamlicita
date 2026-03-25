import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMove, KanbanMoveError, KanbanColuna } from '@/lib/kanban'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cardId, colunaDestino, motivo } = body as {
      cardId: string
      colunaDestino: string
      motivo?: string
    }

    if (!cardId || !colunaDestino) {
      return NextResponse.json({ error: 'cardId e colunaDestino são obrigatórios' }, { status: 400 })
    }

    // Buscar score do card para validar FN
    const card = await db.kanbanCard.findUnique({
      where: { id: cardId },
      include: {
        licitacao: {
          include: { score: { select: { falsoNegativoNivelRisco: true } } },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    const falsoNegativoNivelRisco = card.licitacao.score?.falsoNegativoNivelRisco ?? 'baixo'

    validateMove({ colunaDestino, falsoNegativoNivelRisco, motivo })

    const colunaOrigem = card.colunaAtual

    await db.kanbanCard.update({
      where: { id: cardId },
      data: { colunaAtual: colunaDestino as KanbanColuna },
    })

    await db.kanbanMovimentacao.create({
      data: {
        cardId,
        licitacaoId: card.licitacaoId,
        colunaOrigem,
        colunaDestino: colunaDestino as KanbanColuna,
        automatico: false,
        motivo,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof KanbanMoveError) {
      return NextResponse.json({ error: error.code }, { status: 400 })
    }
    console.error('[POST /api/kanban/mover]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
