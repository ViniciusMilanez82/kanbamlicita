import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const licitacoes = await db.licitacao.findMany({
      include: {
        card: {
          select: {
            id: true,
            colunaAtual: true,
            urgente: true,
            bloqueado: true,
            motivoBloqueio: true,
            responsavel: { select: { id: true, name: true } },
          },
        },
        score: {
          select: {
            scoreFinal: true,
            faixaClassificacao: true,
            valorCapturavelEstimado: true,
            falsoNegativoNivelRisco: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    return NextResponse.json({ licitacoes })
  } catch (error) {
    console.error('[GET /api/licitacoes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
