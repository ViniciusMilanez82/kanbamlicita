import { db } from '@/lib/db'
import { runFonteSync } from '@/lib/captacao/sync'
import type { CaptacaoSource } from '@/lib/captacao/types'

describe('runFonteSync', () => {
  const createdFonteIds: string[] = []

  afterEach(async () => {
    for (const fonteId of createdFonteIds.splice(0)) {
      const fonte = await db.captacaoFonte.findUnique({
        where: { id: fonteId },
        select: { nome: true },
      })
      if (fonte?.nome) {
        await db.licitacao.deleteMany({ where: { fonteCaptacao: fonte.nome } })
      }
      await db.captacaoPayload.deleteMany({ where: { fonteId } })
      await db.captacaoExecucao.deleteMany({ where: { fonteId } })
      await db.captacaoFonte.deleteMany({ where: { id: fonteId } })
    }
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  async function createFonte(tipo = 'mock') {
    const fonte = await db.captacaoFonte.create({
      data: {
        nome: `Fonte Teste ${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tipo,
        endpointBase: 'mock://fonte',
      },
      select: { id: true, nome: true },
    })
    createdFonteIds.push(fonte.id)
    return fonte
  }

  it('cria execução concluída, grava payloads, licitações e cards', async () => {
    const fonte = await createFonte()

    const source: CaptacaoSource = {
      tipo: 'mock',
      async fetch() {
        return [
          {
            idExternoOrigem: 'ext-1',
            payloadBruto: {
              orgao: 'Órgão A',
              numero: 'PE-001',
              objeto: 'Registro 1',
            },
          },
          {
            idExternoOrigem: 'ext-2',
            payloadBruto: {
              orgao: 'Órgão B',
              numero: 'PE-002',
              objeto: 'Registro 2',
            },
          },
        ]
      },
    }

    const result = await runFonteSync(fonte.id, source)

    expect(result.status).toBe('concluido')
    expect(result.totalLidos).toBe(2)
    expect(result.totalNovos).toBe(2)
    expect(result.totalAtualizados).toBe(0)
    expect(result.totalErros).toBe(0)

    const execucao = await db.captacaoExecucao.findUniqueOrThrow({
      where: { id: result.execucaoId },
    })
    expect(execucao.status).toBe('concluido')
    expect(execucao.finalizadoEm).not.toBeNull()

    const payloads = await db.captacaoPayload.findMany({
      where: { execucaoId: result.execucaoId },
      orderBy: { capturadoEm: 'asc' },
    })
    expect(payloads).toHaveLength(2)
    expect(payloads.every((p) => p.statusProcessamento === 'processado')).toBe(true)

    const licitacoes = await db.licitacao.findMany({
      where: { fonteCaptacao: fonte.nome },
    })
    expect(licitacoes).toHaveLength(2)

    const cards = await db.kanbanCard.findMany({
      where: { licitacaoId: { in: licitacoes.map((l) => l.id) } },
    })
    expect(cards).toHaveLength(2)
    expect(cards.every((c) => c.colunaAtual === 'captadas_automaticamente')).toBe(true)

    const fonteAtualizada = await db.captacaoFonte.findUniqueOrThrow({
      where: { id: fonte.id },
      select: { ultimaSincronizacao: true },
    })
    expect(fonteAtualizada.ultimaSincronizacao).not.toBeNull()
  })

  it('na segunda sync com mesmo id externo, atualiza em vez de criar novo', async () => {
    const fonte = await createFonte()

    const source: CaptacaoSource = {
      tipo: 'mock',
      async fetch() {
        return [
          {
            idExternoOrigem: 'stable-1',
            payloadBruto: {
              orgao: 'Órgão Dup',
              numero: 'PE-DUP',
              objeto: 'Primeira versão',
            },
          },
        ]
      },
    }

    const r1 = await runFonteSync(fonte.id, source)
    expect(r1.totalNovos).toBe(1)
    expect(r1.totalAtualizados).toBe(0)

    const r2 = await runFonteSync(fonte.id, source)
    expect(r2.totalNovos).toBe(0)
    expect(r2.totalAtualizados).toBe(1)

    const count = await db.licitacao.count({ where: { fonteCaptacao: fonte.nome } })
    expect(count).toBe(1)
  })

  it('marca execução com erro quando o provider falha', async () => {
    const fonte = await createFonte()

    const source: CaptacaoSource = {
      tipo: 'mock',
      async fetch() {
        throw new Error('falha simulada')
      },
    }

    const result = await runFonteSync(fonte.id, source)

    expect(result.status).toBe('erro')
    expect(result.error).toContain('falha simulada')
    expect(result.totalLidos).toBe(0)
    expect(result.totalNovos).toBe(0)
    expect(result.totalAtualizados).toBe(0)
    expect(result.totalErros).toBe(1)

    const execucao = await db.captacaoExecucao.findUniqueOrThrow({
      where: { id: result.execucaoId },
    })
    expect(execucao.status).toBe('erro')
    expect(execucao.logResumo).toContain('falha simulada')

    const payloads = await db.captacaoPayload.count({
      where: { execucaoId: result.execucaoId },
    })
    expect(payloads).toBe(0)
  })
})
