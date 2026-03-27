import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params

  const execucoes = await db.captacaoExecucao.findMany({
    where: { fonteId: id },
    orderBy: { iniciadoEm: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      iniciadoEm: true,
      finalizadoEm: true,
      totalLidos: true,
      totalNovos: true,
      totalAtualizados: true,
      totalDescartadosDuplicidade: true,
      totalErros: true,
      logResumo: true,
    },
  })

  return NextResponse.json({ execucoes })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { nome?: string; tipo?: string; endpointBase?: string; ativo?: boolean }

  const fonte = await db.captacaoFonte.update({
    where: { id },
    data: body,
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
  })
  return NextResponse.json({ fonte })
}
