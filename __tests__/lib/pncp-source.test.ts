import { jest } from '@jest/globals'
import {
  buildPncpComprasUrl,
  createPncpSource,
  formatPncpHttpErroLegivel,
  mergePncpConfigDefaults,
  probePncpFonte,
} from '@/lib/captacao/pncp-source'

function mockFetch(): jest.MockedFunction<typeof fetch> {
  return jest.fn() as jest.MockedFunction<typeof fetch>
}

describe('formatPncpHttpErroLegivel', () => {
  it('mapeia 500 com JDBC do PNCP para mensagem em português', () => {
    const body = JSON.stringify({
      timestamp: '2026-03-28T23:46:36.419+00:00',
      status: 500,
      error: 'Internal Server Error',
      message: 'Failed to obtain JDBC Connection',
      path: '/pncp-consulta/v1/contratacoes/atualizacao',
    })
    const m = formatPncpHttpErroLegivel(500, body)
    expect(m).toContain('JDBC')
    expect(m).toContain('portal PNCP')
    expect(m).not.toContain('timestamp')
  })

  it('503 retorna texto de indisponível', () => {
    expect(formatPncpHttpErroLegivel(503, '{}')).toContain('indisponível')
  })
})

describe('buildPncpComprasUrl', () => {
  it('monta URL de atualização com datas yyyyMMdd e modalidade', () => {
    const u = buildPncpComprasUrl('https://pncp.gov.br/api/consulta', 'atualizacao', {
      dataInicial: '20260320',
      dataFinal: '20260327',
      codigoModalidadeContratacao: 6,
      pagina: 1,
      tamanhoPagina: 50,
    })
    expect(u).toContain('/v1/contratacoes/atualizacao')
    expect(u).toContain('dataInicial=20260320')
    expect(u).toContain('codigoModalidadeContratacao=6')
  })

  it('monta URL de proposta com dataFinal', () => {
    const u = buildPncpComprasUrl('https://pncp.gov.br/api/consulta', 'proposta', {
      dataFinal: '20260327',
      pagina: 2,
      tamanhoPagina: 10,
    })
    expect(u).toContain('/v1/contratacoes/proposta')
    expect(u).toContain('dataFinal=20260327')
    expect(u).toContain('pagina=2')
  })

  it('mantém o prefixo /api/consulta (path absoluto /v1/... quebraria a base)', () => {
    const u = buildPncpComprasUrl('https://pncp.gov.br/api/consulta', 'atualizacao', {
      dataInicial: '20260320',
      dataFinal: '20260327',
    })
    expect(u).toMatch(
      /^https:\/\/pncp\.gov\.br\/api\/consulta\/v1\/contratacoes\/atualizacao\?/
    )
  })
})

describe('createPncpSource', () => {
  it('pagina até esgotar e mapeia registros', async () => {
    const fetchImpl = mockFetch()
    fetchImpl
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ numeroControlePNCP: 'A-1', objetoCompra: 'X' }],
            numeroPagina: 1,
            totalPaginas: 2,
            paginasRestantes: 1,
            empty: false,
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ numeroControlePNCP: 'B-2', objetoCompra: 'Y' }],
            numeroPagina: 2,
            totalPaginas: 2,
            paginasRestantes: 0,
            empty: false,
          }),
      } as Response)

    const src = createPncpSource({
      fonteId: 'f1',
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {
        modo: 'atualizacao',
        codigoModalidadeContratacao: 6,
        maxPaginas: 10,
        tamanhoPagina: 50,
        diasJanela: 3,
      },
      fetchImpl,
    })

    const rows = await src.fetch()
    expect(rows).toHaveLength(2)
    expect(rows[0].idExternoOrigem).toBe('A-1')
    expect(rows[1].payloadBruto).toMatchObject({ numeroControlePNCP: 'B-2' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('importação: timeout na página propaga mensagem amigável', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout')
    timeoutErr.name = 'TimeoutError'
    const fetchImpl = mockFetch().mockRejectedValue(timeoutErr)
    const src = createPncpSource({
      fonteId: 'f1',
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: { maxPaginas: 1, modo: 'atualizacao', codigoModalidadeContratacao: 6 },
      fetchImpl,
    })
    await expect(src.fetch()).rejects.toThrow(/portal PNCP/)
  })

  it('usa modalidade 6 por padrão quando configuracao vazia', async () => {
    const fetchImpl = mockFetch().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [],
          totalRegistros: 0,
          numeroPagina: 1,
          totalPaginas: 0,
          paginasRestantes: 0,
          empty: true,
        }),
    } as Response)
    const src = createPncpSource({
      fonteId: 'f1',
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {},
      fetchImpl,
    })
    await src.fetch()
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0])
    expect(calledUrl).toContain('codigoModalidadeContratacao=6')
  })

  it('filtra registros por palavrasChaveObjeto no objeto', async () => {
    const fetchImpl = mockFetch().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [
            { numeroControlePNCP: 'A', objetoCompra: 'Container habitacional' },
            { numeroControlePNCP: 'B', objetoCompra: 'Papel higiênico' },
          ],
          totalRegistros: 2,
          numeroPagina: 1,
          totalPaginas: 1,
          paginasRestantes: 0,
          empty: false,
        }),
    } as Response)
    const src = createPncpSource({
      fonteId: 'f1',
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: { palavrasChaveObjeto: 'container' },
      fetchImpl,
    })
    const rows = await src.fetch()
    expect(rows).toHaveLength(1)
    expect(rows[0].idExternoOrigem).toBe('A')
  })
})

describe('mergePncpConfigDefaults', () => {
  it('preenche modalidade em atualizacao', () => {
    const m = mergePncpConfigDefaults({})
    expect(m.modo).toBe('atualizacao')
    expect(m.codigoModalidadeContratacao).toBe(6)
  })

  it('não força modalidade em proposta', () => {
    const m = mergePncpConfigDefaults({ modo: 'proposta' })
    expect(m.modo).toBe('proposta')
    expect(m.codigoModalidadeContratacao).toBeUndefined()
  })

  it('interpreta configuracao JSON em string', () => {
    const m = mergePncpConfigDefaults('{"palavrasChaveObjeto":"x","diasJanela":3}' as unknown as string)
    expect(m.diasJanela).toBe(3)
    expect(m.palavrasChaveObjeto).toBe('x')
  })
})

describe('probePncpFonte', () => {
  it('por padrão só consulta a 1ª página (menos pressão no PNCP)', async () => {
    const fetchImpl = mockFetch().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [{ numeroControlePNCP: 'P1', objetoCompra: 'A' }],
          totalRegistros: 99,
          totalPaginas: 10,
          numeroPagina: 1,
          paginasRestantes: 9,
        }),
    } as Response)
    const r = await probePncpFonte({
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {},
      fetchImpl,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.totalRegistros).toBe(99)
      expect(r.paginasPercorridasNoLote).toBe(1)
      expect(r.registrosBrutosNoLote).toBe(1)
      expect(r.escaneamentoLoteCompleto).toBe(false)
      expect(r.maxPaginasFonte).toBe(20)
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('com escaneamentoCompleto percorre páginas e soma o lote', async () => {
    const fetchImpl = mockFetch()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ numeroControlePNCP: 'P1', objetoCompra: 'A' }],
            totalRegistros: 99,
            totalPaginas: 2,
            numeroPagina: 1,
            paginasRestantes: 1,
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ numeroControlePNCP: 'P2', objetoCompra: 'B' }],
            totalPaginas: 2,
            numeroPagina: 2,
            paginasRestantes: 0,
          }),
      } as Response)
    const r = await probePncpFonte({
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {},
      fetchImpl,
      escaneamentoCompleto: true,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.totalRegistros).toBe(99)
      expect(r.paginasPercorridasNoLote).toBe(2)
      expect(r.registrosBrutosNoLote).toBe(2)
      expect(r.registrosAposTriagemNoLote).toBe(2)
      expect(r.escaneamentoLoteCompleto).toBe(true)
    }
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retenta em HTTP 500 antes de desistir', async () => {
    const okJson = JSON.stringify({
      data: [{ numeroControlePNCP: 'X', objetoCompra: 'ok' }],
      totalRegistros: 1,
      totalPaginas: 1,
      numeroPagina: 1,
      paginasRestantes: 0,
    })
    const fetchImpl = mockFetch()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '{"message":"Internal"}',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => okJson,
      } as Response)
    const r = await probePncpFonte({
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {},
      fetchImpl,
    })
    expect(r.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('na probe, triagem por objeto na 1ª página e totais do lote', async () => {
    const fetchImpl = mockFetch().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [
            { numeroControlePNCP: 'A', objetoCompra: 'Módulo habitacional' },
            { numeroControlePNCP: 'B', objetoCompra: 'Lápis' },
          ],
          totalRegistros: 5000,
          totalPaginas: 1,
          numeroPagina: 1,
          paginasRestantes: 0,
        }),
    } as Response)
    const r = await probePncpFonte({
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: { palavrasChaveObjeto: 'módulo' },
      fetchImpl,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.totalRegistros).toBe(5000)
      expect(r.registrosNaPrimeiraPaginaBruta).toBe(2)
      expect(r.registrosNaPrimeiraPagina).toBe(1)
      expect(r.registrosBrutosNoLote).toBe(2)
      expect(r.registrosAposTriagemNoLote).toBe(1)
      expect(r.paginasPercorridasNoLote).toBe(1)
      expect(r.escaneamentoLoteCompleto).toBe(false)
      expect(r.triagemObjetoAtiva).toBe(true)
      expect(r.palavrasTriagemCount).toBe(1)
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('mapeia timeout do fetch para mensagem em português', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout')
    timeoutErr.name = 'TimeoutError'
    const fetchImpl = mockFetch().mockRejectedValue(timeoutErr)
    const r = await probePncpFonte({
      endpointBase: 'https://pncp.gov.br/api/consulta',
      configuracao: {},
      fetchImpl,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erro).toContain('portal PNCP')
      expect(r.erro).toMatch(/tentativa/i)
    }
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
})
