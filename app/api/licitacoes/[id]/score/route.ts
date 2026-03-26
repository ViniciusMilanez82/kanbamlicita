import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const exists = await db.licitacao.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
    }

    const { id: _id, licitacaoId: _lid, criadoEm: _c, atualizadoEm: _a, ...data } = body

    const score = await db.licitacaoScore.upsert({
      where: { licitacaoId: id },
      create: { licitacaoId: id, ...data },
      update: { ...data },
    })

    return NextResponse.json({ score })
  } catch (error) {
    console.error('[PUT /api/licitacoes/[id]/score]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
