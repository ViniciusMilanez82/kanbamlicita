import {
  CAMPOS_CAPTACAO_PNCP_PADRAO,
  mergeCamposCaptacaoPncp,
} from '@/lib/config/campos-captacao-pncp'

describe('campos-captacao-pncp', () => {
  it('mergeCamposCaptacaoPncp usa padrão quando vazio', () => {
    expect(mergeCamposCaptacaoPncp(null)).toEqual(CAMPOS_CAPTACAO_PNCP_PADRAO)
    expect(mergeCamposCaptacaoPncp({})).toEqual(CAMPOS_CAPTACAO_PNCP_PADRAO)
  })

  it('mergeCamposCaptacaoPncp aplica overrides booleanos', () => {
    const m = mergeCamposCaptacaoPncp({ objetoResumido: false, orgao: true })
    expect(m.objetoResumido).toBe(false)
    expect(m.orgao).toBe(true)
    expect(m.uf).toBe(CAMPOS_CAPTACAO_PNCP_PADRAO.uf)
  })
})
