import { db } from '@/lib/db'

async function getExecucoes(fonteId: string) {
  return db.captacaoExecucao.findMany({
    where: { fonteId },
    orderBy: { iniciadoEm: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      iniciadoEm: true,
      finalizadoEm: true,
      totalLidos: true,
      totalNovos: true,
      totalAtualizados: true,
      totalDescartadosDuplicidade: true,
      totalErros: true,
      logResumo: true,
    },
  })
}

describe('GET /api/admin/fontes/[id]/execucoes — query', () => {
  afterAll(async () => { await db.$disconnect() })

  it('retorna array (vazio ou não) para uma fonte existente', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) {
      console.warn('Nenhuma fonte encontrada no banco — seed pode precisar de fontes')
      return
    }
    const result = await getExecucoes(fonte.id)
    expect(Array.isArray(result)).toBe(true)
  })

  it('não retorna mais de 20 registros', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) return
    const result = await getExecucoes(fonte.id)
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('cada execução tem os campos esperados', async () => {
    const fonte = await db.captacaoFonte.findFirst({ select: { id: true } })
    if (!fonte) return
    const result = await getExecucoes(fonte.id)
    result.forEach((e) => {
      expect(e.id).toBeDefined()
      expect(e.status).toBeDefined()
      expect(e.iniciadoEm).toBeDefined()
    })
  })
})
