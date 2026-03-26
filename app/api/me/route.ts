import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json({ user })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { name, senha } = body as { name?: string; senha?: string }

  const data: { name?: string; senha?: string } = {}
  if (name !== undefined) data.name = name
  if (senha) data.senha = await bcrypt.hash(senha, 10)

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json({ user })
}
