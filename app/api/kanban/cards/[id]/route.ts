import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { responsavelId } = await req.json() as { responsavelId: string | null }

  // Validar que o usuário existe e está ativo (se não for null)
  if (responsavelId !== null) {
    const user = await db.user.findUnique({ where: { id: responsavelId }, select: { ativo: true } })
    if (!user || !user.ativo) {
      return NextResponse.json({ error: 'Usuário inválido ou inativo' }, { status: 400 })
    }
  }

  const card = await db.kanbanCard.update({
    where: { id },
    data: { responsavelId },
    select: {
      id: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ card })
}
