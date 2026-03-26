import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    name?: string; senha?: string; role?: string; ativo?: boolean
  }

  if (body.role !== undefined && !['user', 'admin'].includes(body.role)) {
    return NextResponse.json({ error: 'Role inválida' }, { status: 400 })
  }

  // Admin não pode desativar a si mesmo
  if (body.ativo === false && id === session.user.id) {
    return NextResponse.json({ error: 'Não é possível desativar a própria conta' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.role !== undefined) data.role = body.role
  if (body.ativo !== undefined) data.ativo = body.ativo
  if (body.senha) data.senha = await bcrypt.hash(body.senha, 10)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true },
  })
  return NextResponse.json({ user })
}
