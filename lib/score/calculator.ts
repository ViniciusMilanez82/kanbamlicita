import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

export type ScoreSugestao = {
  scoreAderenciaDireta: number
  scoreAderenciaAplicacao: number
  scoreContextoOculto: number
  scoreModeloComercial: number
  scorePotencialEconomico: number
  scoreQualidadeEvidencia: number
  scoreFinal: number
  faixaClassificacao: string
}

// Valores canônicos da analise manual: 'alta', 'média' (com acento), 'baixa', 'nenhuma'
function nivelAnalise(nivel: string): number {
  if (nivel === 'alta') return 100
  if (nivel === 'média') return 60
  if (nivel === 'baixa') return 30
  return 0
}

// Valores canônicos da IA: 'alta', 'media' (sem acento), 'baixa', 'nenhuma'
function nivelIa(nivel: string): number {
  if (nivel === 'alta') return 100
  if (nivel === 'media') return 60
  if (nivel === 'baixa') return 30
  return 0
}

function faixa(score: number): string {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export function calcularScore(
  analise: AnaliseDetalhe,
  analiseIaResult: AnaliseIaResult | null
): ScoreSugestao {
  const scoreAderenciaDireta =
    analise && analise.aderenciaDiretaExiste ? nivelAnalise(analise.aderenciaDiretaNivel) : 0

  const scoreAderenciaAplicacao =
    analise && analise.aderenciaAplicacaoExiste ? nivelAnalise(analise.aderenciaAplicacaoNivel) : 0

  const scoreContextoOculto =
    analise && analise.contextoOcultoExiste ? nivelAnalise(analise.contextoOcultoNivel) : 0

  const oportunidadeFields = analise
    ? [
        analise.oportunidadeNoObjeto,
        analise.oportunidadeNoTr,
        analise.oportunidadeNosLotes,
        analise.oportunidadeNosItens,
        analise.oportunidadeNaPlanilha,
        analise.oportunidadeNoMemorial,
        analise.oportunidadeEmAnexoTecnico,
      ]
    : []
  const scoreModeloComercial = analise
    ? (oportunidadeFields.filter(Boolean).length / 7) * 100
    : 0

  const scorePotencialEconomico = analiseIaResult
    ? nivelIa(analiseIaResult.aderencia.nivel)
    : 0

  const scoreQualidadeEvidencia = analiseIaResult
    ? nivelIa(analiseIaResult.confianca)
    : 0

  const scoreFinal =
    (scoreAderenciaDireta * 15 +
      scoreAderenciaAplicacao * 25 +
      scoreContextoOculto * 20 +
      scoreModeloComercial * 15 +
      scorePotencialEconomico * 15 +
      scoreQualidadeEvidencia * 10) /
    100

  return {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
    scoreFinal: Math.round(scoreFinal * 100) / 100,
    faixaClassificacao: faixa(scoreFinal),
  }
}
