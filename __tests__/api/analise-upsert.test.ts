import { db } from '@/lib/db'

async function upsertAnalise(licitacaoId: string, body: Record<string, unknown>) {
  // Verifica existência
  const exists = await db.licitacao.findUnique({ where: { id: licitacaoId } })
  if (!exists) throw new Error('NOT_FOUND')

  return db.licitacaoAnalise.upsert({
    where: { licitacaoId },
    create: { licitacaoId, ...body },
    update: { ...body },
  })
}

describe('upsert LicitacaoAnalise', () => {
  let licitacaoId: string

  beforeAll(async () => {
    const l = await db.licitacao.findFirst()
    if (!l) throw new Error('Seed não encontrado')
    licitacaoId = l.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('cria análise quando não existe', async () => {
    // Limpar para garantir estado limpo
    await db.licitacaoAnalise.deleteMany({ where: { licitacaoId } })

    const result = await upsertAnalise(licitacaoId, {
      aderenciaDiretaExiste: true,
      aderenciaDiretaNivel: 'alta',
    })

    expect(result.licitacaoId).toBe(licitacaoId)
    expect(result.aderenciaDiretaExiste).toBe(true)
    expect(result.aderenciaDiretaNivel).toBe('alta')
  })

  it('atualiza análise quando já existe', async () => {
    const result = await upsertAnalise(licitacaoId, {
      aderenciaDiretaExiste: false,
      aderenciaDiretaNivel: 'nenhuma',
    })

    expect(result.aderenciaDiretaExiste).toBe(false)
    expect(result.aderenciaDiretaNivel).toBe('nenhuma')
  })

  it('lança NOT_FOUND para id inexistente', async () => {
    await expect(
      upsertAnalise('id-que-nao-existe', {})
    ).rejects.toThrow('NOT_FOUND')
  })
})
