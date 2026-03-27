import { db } from '@/lib/db'

async function getUsuariosAtivos() {
  return db.user.findMany({
    where: { ativo: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

describe('GET /api/usuarios-ativos — query', () => {
  afterAll(async () => { await db.$disconnect() })

  it('retorna apenas usuários ativos', async () => {
    const result = await getUsuariosAtivos()
    expect(Array.isArray(result)).toBe(true)
    result.forEach((u) => {
      expect(u.id).toBeDefined()
      expect(u.name).toBeDefined()
    })
  })

  it('não retorna campos sensíveis (email, password)', async () => {
    const result = await getUsuariosAtivos()
    result.forEach((u: Record<string, unknown>) => {
      expect(u.email).toBeUndefined()
      expect(u.password).toBeUndefined()
    })
  })
})
