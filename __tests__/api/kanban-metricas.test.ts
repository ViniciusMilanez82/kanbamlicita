import { db } from '@/lib/db'

async function getMetricasQuery() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo] =
    await Promise.all([
      db.kanbanCard.count({ where: { criadoEm: { gte: hoje } } }),
      db.kanbanCard.count({ where: { colunaAtual: 'em_analise' } }),
      db.licitacaoScore.count({ where: { faixaClassificacao: { in: ['A', 'A+'] } } }),
      db.kanbanCard.count({ where: { urgente: true } }),
      db.licitacaoScore.count({ where: { falsoNegativoNivelRisco: 'alto' } }),
    ])

  return { captadasHoje, emAnalise, classificacaoAouAPlus, urgentes, riscoAltoFalsoNegativo }
}

describe('GET /api/kanban/metricas — query', () => {
  afterAll(async () => {
    await db.$disconnect()
  })

  it('retorna objeto com as 5 métricas', async () => {
    const result = await getMetricasQuery()
    expect(result).toHaveProperty('captadasHoje')
    expect(result).toHaveProperty('emAnalise')
    expect(result).toHaveProperty('classificacaoAouAPlus')
    expect(result).toHaveProperty('urgentes')
    expect(result).toHaveProperty('riscoAltoFalsoNegativo')
  })

  it('todos os valores são números >= 0', async () => {
    const result = await getMetricasQuery()
    Object.values(result).forEach((v) => {
      expect(typeof v).toBe('number')
      expect(v).toBeGreaterThanOrEqual(0)
    })
  })
})
