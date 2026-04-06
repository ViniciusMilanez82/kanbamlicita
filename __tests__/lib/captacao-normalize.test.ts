import { buildDedupeHash, normalizePayloadBruto } from '@/lib/captacao/normalize'

describe('normalizePayloadBruto', () => {
  it('extrai campos do payload mock', () => {
    const n = normalizePayloadBruto({
      orgao: 'Órgão X',
      numero: 'PE 001/2026',
      objeto: 'Locação de módulos',
    })
    expect(n.orgao).toBe('Órgão X')
    expect(n.numeroLicitacao).toBe('PE 001/2026')
    expect(n.objetoResumido).toBe('Locação de módulos')
  })

  it('usa defaults quando faltam campos', () => {
    const n = normalizePayloadBruto({ objeto: 'Só objeto' })
    expect(n.orgao).toBeNull()
    expect(n.numeroLicitacao).toBeNull()
    expect(n.objetoResumido).toBe('Só objeto')
  })

  it('extrai campos do payload PNCP (RecuperarCompraPublicacaoDTO)', () => {
    const n = normalizePayloadBruto({
      orgaoEntidade: { razaoSocial: 'MUNICIPIO X' },
      numeroCompra: 'PE 1/2026',
      objetoCompra: 'Objeto PNCP',
      dataPublicacaoPncp: '2026-03-20T00:00:03',
    })
    expect(n.orgao).toBe('MUNICIPIO X')
    expect(n.numeroLicitacao).toBe('PE 1/2026')
    expect(n.objetoResumido).toBe('Objeto PNCP')
    expect(n.dataPublicacao).not.toBeNull()
  })

  it('lê objeto aninhado em compra quando a raiz não traz objetoCompra', () => {
    const n = normalizePayloadBruto({
      numeroControlePNCP: 'x',
      compra: { objetoCompra: 'Texto só no filho' },
    })
    expect(n.objetoResumido).toBe('Texto só no filho')
  })

  it('mapeia DTO real da API PNCP (publicação / atualização)', () => {
    const n = normalizePayloadBruto({
      orgaoEntidade: { cnpj: '01131010000129', razaoSocial: 'MUNICIPIO DE OUVIDOR' },
      numeroCompra: '013',
      processo: '1017/2026',
      objetoCompra: 'Serviços técnicos',
      unidadeOrgao: {
        ufNome: 'Goiás',
        ufSigla: 'GO',
        municipioNome: 'Ouvidor',
        nomeUnidade: 'MUNICIPIO DE OUVIDOR',
      },
      valorTotalEstimado: 242833.33,
      dataPublicacaoPncp: '2026-03-01T06:03:13',
      dataAberturaProposta: '2026-03-02T00:00:00',
      modalidadeNome: 'Pregão - Eletrônico',
      modoDisputaNome: 'Aberto',
      amparoLegal: { nome: 'Lei 14.133/2021, Art. 28, I', codigo: 1 },
      linkSistemaOrigem: 'https://exemplo.gov.br/processo',
    })
    expect(n.orgao).toBe('MUNICIPIO DE OUVIDOR')
    expect(n.numeroLicitacao).toBe('013')
    expect(n.numeroProcesso).toBe('1017/2026')
    expect(n.modalidade).toBe('Pregão - Eletrônico')
    expect(n.tipoDisputa).toBe('Aberto')
    expect(n.criterioJulgamento).toContain('Lei 14.133')
    expect(n.uf).toBe('GO')
    expect(n.municipio).toBe('Ouvidor')
    expect(n.regiao).toBe('Goiás')
    expect(n.valorGlobalEstimado).toBe(242833.33)
    expect(n.dataSessao).not.toBeNull()
    expect(n.linkOrigem).toContain('exemplo.gov.br')
  })
})

describe('buildDedupeHash', () => {
  it('produz o mesmo hash para o mesmo conteúdo normalizado', () => {
    const a = buildDedupeHash({
      orgao: 'A',
      numeroLicitacao: '1',
      objetoResumido: 'Obj',
      dataPublicacao: null,
    })
    const b = buildDedupeHash({
      orgao: 'A',
      numeroLicitacao: '1',
      objetoResumido: 'Obj',
      dataPublicacao: null,
    })
    expect(a).toBe(b)
  })
})
