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

    // Remover campos que não pertencem à tabela
    const { id: _id, licitacaoId: _lid, criadoEm: _c, atualizadoEm: _a, ...data } = body

    const analise = await db.licitacaoAnalise.upsert({
      where: { licitacaoId: id },
      create: { licitacaoId: id, ...data },
      update: { ...data },
    })

    return NextResponse.json({ analise })
  } catch (error) {
    console.error('[PUT /api/licitacoes/[id]/analise]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
