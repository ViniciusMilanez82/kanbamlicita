import {
  collectPalavrasTriagem,
  extrairObjetoCompra,
  filtrarRegistrosTriagemObjeto,
  parsePalavrasChaveObjeto,
  passaTriagemObjeto,
  textoParaTriagem,
} from '@/lib/captacao/pncp-triagem-objeto'
import type { CaptacaoRegistroBruto } from '@/lib/captacao/types'

describe('parsePalavrasChaveObjeto', () => {
  it('divide por vírgula e linha', () => {
    expect(parsePalavrasChaveObjeto('a, b\nc')).toEqual(['a', 'b', 'c'])
  })
  it('aceita array', () => {
    expect(parsePalavrasChaveObjeto(['x', 'y, z'])).toEqual(['x', 'y', 'z'])
  })
})

describe('collectPalavrasTriagem', () => {
  it('lê palavrasChaveObjeto ou palavrasChave', () => {
    expect(collectPalavrasTriagem({ palavrasChaveObjeto: 'a, b' })).toEqual(['a', 'b'])
    expect(collectPalavrasTriagem({ palavrasChave: 'x, y' })).toEqual(['x', 'y'])
  })
})

describe('textoParaTriagem', () => {
  it('inclui informacaoComplementar no haystack', () => {
    const t = textoParaTriagem({
      objetoCompra: 'Serviços gerais',
      informacaoComplementar: 'Fornecimento de container',
    })
    expect(t.toLowerCase()).toContain('container')
  })
})

describe('passaTriagemObjeto', () => {
  it('sem palavras deixa passar', () => {
    expect(passaTriagemObjeto({ objetoCompra: 'qualquer' }, [])).toBe(true)
  })
  it('OR entre termos', () => {
    const p = ['container', 'módulo']
    expect(passaTriagemObjeto({ objetoCompra: 'Aquisição de CONTAINER marítimo' }, p)).toBe(true)
    expect(passaTriagemObjeto({ objetoCompra: 'Serviço de limpeza' }, p)).toBe(false)
  })
  it('ignora acento na busca', () => {
    expect(passaTriagemObjeto({ objetoCompra: 'Alojamento provisório' }, ['alojamento'])).toBe(true)
  })
  it('encontra termo só na informacaoComplementar', () => {
    expect(
      passaTriagemObjeto(
        { objetoCompra: 'Contratação diversa', informacaoComplementar: 'Módulos habitacionais' },
        ['módulo']
      )
    ).toBe(true)
  })

  it('encontra termo em objetoCompra aninhado em compra', () => {
    expect(
      passaTriagemObjeto({ compra: { objetoCompra: 'Fornecimento de container habitacional' } }, ['container'])
    ).toBe(true)
  })
})

describe('filtrarRegistrosTriagemObjeto', () => {
  it('filtra lista de registros', () => {
    const regs: CaptacaoRegistroBruto[] = [
      { idExternoOrigem: '1', payloadBruto: { objetoCompra: 'Container' } },
      { idExternoOrigem: '2', payloadBruto: { objetoCompra: 'Papel A4' } },
    ]
    const out = filtrarRegistrosTriagemObjeto(regs, ['container'])
    expect(out).toHaveLength(1)
    expect(out[0].idExternoOrigem).toBe('1')
  })
})

describe('extrairObjetoCompra', () => {
  it('lê string', () => {
    expect(extrairObjetoCompra({ objetoCompra: 'x' })).toBe('x')
  })
  it('fallback vazio', () => {
    expect(extrairObjetoCompra({})).toBe('')
  })
})
