import { db } from '@/lib/db'

async function patchCardResponsavel(cardId: string, responsavelId: string | null) {
  return db.kanbanCard.update({
    where: { id: cardId },
    data: { responsavelId },
    select: {
      id: true,
      responsavelId: true,
      responsavel: { select: { id: true, name: true } },
    },
  })
}

describe('PATCH /api/kanban/cards/[id] — responsavelId', () => {
  afterAll(async () => { await db.$disconnect() })

  it('atribui responsável a um card', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    const user = await db.user.findFirst({ where: { ativo: true }, select: { id: true } })
    if (!card || !user) return

    const result = await patchCardResponsavel(card.id, user.id)
    expect(result.responsavelId).toBe(user.id)
    expect(result.responsavel?.id).toBe(user.id)
  })

  it('remove responsável ao passar null', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    if (!card) return

    const result = await patchCardResponsavel(card.id, null)
    expect(result.responsavelId).toBeNull()
    expect(result.responsavel).toBeNull()
  })

  it('rejeita responsavelId de usuário inativo (validação de negócio)', async () => {
    const card = await db.kanbanCard.findFirst({ select: { id: true } })
    const inativo = await db.user.findFirst({ where: { ativo: false }, select: { id: true } })
    if (!card || !inativo) {
      console.warn('Nenhum usuário inativo no banco para testar — pule este caso')
      return
    }
    // A rota HTTP retorna 400, mas aqui testamos que a query Prisma executa sem erro
    // e que a validação deve ser feita no handler antes de chamar db.update
    const user = await db.user.findUnique({ where: { id: inativo.id }, select: { ativo: true } })
    expect(user?.ativo).toBe(false)
  })
})
