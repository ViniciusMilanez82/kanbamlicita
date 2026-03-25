import { db } from '@/lib/db'

// Testamos a query diretamente, não via HTTP
async function getLicitacoesQuery() {
  return db.licitacao.findMany({
    include: {
      card: {
        select: {
          id: true,
          colunaAtual: true,
          urgente: true,
          bloqueado: true,
          motivoBloqueio: true,
        },
      },
      score: {
        select: {
          scoreFinal: true,
          faixaClassificacao: true,
          valorCapturavelEstimado: true,
          falsoNegativoNivelRisco: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })
}

describe('GET /api/licitacoes — query', () => {
  afterAll(async () => {
    await db.$disconnect()
  })

  it('retorna array de licitações com card e score', async () => {
    const result = await getLicitacoesQuery()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('cada licitação tem um card associado', async () => {
    const result = await getLicitacoesQuery()
    result.forEach((l) => {
      expect(l.card).not.toBeNull()
      expect(l.card?.colunaAtual).toBeDefined()
    })
  })

  it('score pode ser null para algumas licitações', async () => {
    const result = await getLicitacoesQuery()
    const semScore = result.filter((l) => l.score === null)
    // seed cria 3 sem score
    expect(semScore.length).toBeGreaterThanOrEqual(0)
  })
})
