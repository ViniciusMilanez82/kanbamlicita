import { calcularScore } from '@/lib/score/calculator'
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

const analiseCompleta: AnaliseDetalhe = {
  aderenciaDiretaExiste: true,
  aderenciaDiretaNivel: 'alta',
  aderenciaAplicacaoExiste: true,
  aderenciaAplicacaoNivel: 'alta',
  contextoOcultoExiste: true,
  contextoOcultoNivel: 'alta',
  oportunidadeOcultaExiste: true,
  oportunidadeOcultaForca: 'forte',
  oportunidadeOcultaResumo: null,
  oportunidadeNoObjeto: true,
  oportunidadeNoTr: true,
  oportunidadeNosLotes: true,
  oportunidadeNosItens: true,
  oportunidadeNaPlanilha: true,
  oportunidadeNoMemorial: true,
  oportunidadeEmAnexoTecnico: true,
  portfolioAplicavel: [],
  solucoesMuliteinerAplicaveis: [],
}

const analiseIaCompleta: AnaliseIaResult = {
  aderencia: { nivel: 'alta', justificativa: '' },
  oportunidades: [],
  riscos: [],
  recomendacao: 'AVANCAR',
  resumo: '',
  confianca: 'alta',
}

describe('calcularScore', () => {
  it('caso 1: analise completa (todos alta) + analiseIa completa (alta/alta) → score correto, faixa A+', () => {
    const result = calcularScore(analiseCompleta, analiseIaCompleta)
    // cada componente = 100, score final = 100*15 + 100*25 + 100*20 + 100*15 + 100*15 + 100*10 / 100 = 100
    expect(result.scoreAderenciaDireta).toBe(100)
    expect(result.scoreAderenciaAplicacao).toBe(100)
    expect(result.scoreContextoOculto).toBe(100)
    expect(result.scoreModeloComercial).toBe(100)
    expect(result.scorePotencialEconomico).toBe(100)
    expect(result.scoreQualidadeEvidencia).toBe(100)
    expect(result.scoreFinal).toBe(100)
    expect(result.faixaClassificacao).toBe('A+')
  })

  it('caso 2: analise=null + analiseIa=null → todos componentes=0, faixa D', () => {
    const result = calcularScore(null, null)
    expect(result.scoreAderenciaDireta).toBe(0)
    expect(result.scoreAderenciaAplicacao).toBe(0)
    expect(result.scoreContextoOculto).toBe(0)
    expect(result.scoreModeloComercial).toBe(0)
    expect(result.scorePotencialEconomico).toBe(0)
    expect(result.scoreQualidadeEvidencia).toBe(0)
    expect(result.scoreFinal).toBe(0)
    expect(result.faixaClassificacao).toBe('D')
  })

  it('caso 3: analise populada (alta) + analiseIa=null → últimos 2 componentes=0', () => {
    const result = calcularScore(analiseCompleta, null)
    expect(result.scoreAderenciaDireta).toBe(100)
    expect(result.scoreAderenciaAplicacao).toBe(100)
    expect(result.scoreContextoOculto).toBe(100)
    expect(result.scoreModeloComercial).toBe(100)
    expect(result.scorePotencialEconomico).toBe(0)
    expect(result.scoreQualidadeEvidencia).toBe(0)
    // 100*15 + 100*25 + 100*20 + 100*15 + 0*15 + 0*10 = 7500 / 100 = 75
    expect(result.scoreFinal).toBe(75)
    expect(result.faixaClassificacao).toBe('A')
  })

  it('caso 4: analise=null + analiseIa populado (alta/alta) → primeiros 4 componentes=0', () => {
    const result = calcularScore(null, analiseIaCompleta)
    expect(result.scoreAderenciaDireta).toBe(0)
    expect(result.scoreAderenciaAplicacao).toBe(0)
    expect(result.scoreContextoOculto).toBe(0)
    expect(result.scoreModeloComercial).toBe(0)
    expect(result.scorePotencialEconomico).toBe(100)
    expect(result.scoreQualidadeEvidencia).toBe(100)
    // 0*15 + 0*25 + 0*20 + 0*15 + 100*15 + 100*10 = 2500 / 100 = 25
    expect(result.scoreFinal).toBe(25)
    expect(result.faixaClassificacao).toBe('D')
  })

  it('caso 5: analise completa (todos baixa) + analiseIa completo (baixa/baixa) → faixa D', () => {
    const analiseBaixa: AnaliseDetalhe = {
      ...analiseCompleta,
      aderenciaDiretaNivel: 'baixa',
      aderenciaAplicacaoNivel: 'baixa',
      contextoOcultoNivel: 'baixa',
      oportunidadeNoObjeto: false,
      oportunidadeNoTr: false,
      oportunidadeNosLotes: false,
      oportunidadeNosItens: false,
      oportunidadeNaPlanilha: false,
      oportunidadeNoMemorial: false,
      oportunidadeEmAnexoTecnico: false,
    }
    const analiseIaBaixa: AnaliseIaResult = {
      ...analiseIaCompleta,
      aderencia: { nivel: 'baixa', justificativa: '' },
      confianca: 'baixa',
    }
    const result = calcularScore(analiseBaixa, analiseIaBaixa)
    // aderencia/contexto/ia = 30; scoreModeloComercial = 0 (7 booleanos false)
    // (30*15 + 30*25 + 30*20 + 0*15 + 30*15 + 30*10) / 100 = 25.5
    expect(result.scoreFinal).toBe(25.5)
    expect(result.faixaClassificacao).toBe('D')
  })
})
