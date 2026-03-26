import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const usuarios = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  })
  return NextResponse.json({ usuarios })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { name, email, senha, role } = await req.json() as {
    name: string; email: string; senha: string; role: string
  }

  if (!['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
  }

  const senhaHash = await bcrypt.hash(senha, 10)
  const user = await db.user.create({
    data: { name, email, senha: senhaHash, role },
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}
