import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const config = await db.configuracaoSistema.findUnique({ where: { id: 'default' } })
  return NextResponse.json({ config })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const body = await req.json()
  const { pesosScore, faixasScore, segmentos, listasParecerTab } = body

  const config = await db.configuracaoSistema.upsert({
    where: { id: 'default' },
    create: { id: 'default', pesosScore, faixasScore, segmentos, listasParecerTab },
    update: { pesosScore, faixasScore, segmentos, listasParecerTab },
  })
  return NextResponse.json({ config })
}
