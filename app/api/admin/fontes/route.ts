import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const fontes = await db.captacaoFonte.findMany({
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
    orderBy: { criadoEm: 'asc' },
  })
  return NextResponse.json({ fontes })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { nome, tipo, endpointBase } = await req.json() as {
    nome: string; tipo: string; endpointBase?: string
  }

  const fonte = await db.captacaoFonte.create({
    data: { nome, tipo, endpointBase },
    select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true },
  })
  return NextResponse.json({ fonte }, { status: 201 })
}
