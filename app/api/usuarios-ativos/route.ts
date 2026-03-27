import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const usuarios = await db.user.findMany({
    where: { ativo: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ usuarios })
}
