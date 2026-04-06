import { configToPncpForm, mergeSalvarPncp } from '@/lib/captacao/pncp-ui-config'

describe('mergeSalvarPncp', () => {
  it('grava palavrasChaveObjeto e uf', () => {
    const m = mergeSalvarPncp({}, {
      uf: 'sp',
      palavrasChaveObjeto: 'container, módulo',
      diasJanela: '14',
      maxPaginas: '5',
    })
    expect(m.uf).toBe('SP')
    expect(m.palavrasChaveObjeto).toBe('container, módulo')
    expect(m.diasJanela).toBe(14)
    expect(m.maxPaginas).toBe(5)
  })
})

describe('configToPncpForm', () => {
  it('lê configuracao salva', () => {
    const f = configToPncpForm({ uf: 'RJ', palavrasChaveObjeto: 'x', diasJanela: 3, maxPaginas: 10 })
    expect(f.uf).toBe('RJ')
    expect(f.palavrasChaveObjeto).toBe('x')
    expect(f.diasJanela).toBe('3')
    expect(f.maxPaginas).toBe('10')
  })
})
