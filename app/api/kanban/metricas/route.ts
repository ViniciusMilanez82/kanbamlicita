import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const [captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo] =
      await Promise.all([
        db.kanbanCard.count({ where: { criadoEm: { gte: hoje } } }),
        db.kanbanCard.count({ where: { colunaAtual: 'em_analise' } }),
        db.licitacaoScore.count({ where: { faixaClassificacao: { in: ['A', 'A+'] } } }),
        db.kanbanCard.count({ where: { urgente: true } }),
        db.licitacaoScore.count({ where: { falsoNegativoNivelRisco: 'alto' } }),
      ])

    return NextResponse.json({
      captadasHoje,
      emAnalise,
      classificacaoAouAPlus,
      urgentes,
      riscoAltoFalsoNegativo,
    })
  } catch (error) {
    console.error('[GET /api/kanban/metricas]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
