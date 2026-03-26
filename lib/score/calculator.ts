import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

export type ConfigPesos = {
  aderenciaDireta: number
  aderenciaAplicacao: number
  contextoOculto: number
  modeloComercial: number
  potencialEconomico: number
  qualidadeEvidencia: number
}

export type ConfigFaixas = {
  aPlus: number
  a: number
  b: number
  c: number
}

export const PESOS_PADRAO: ConfigPesos = {
  aderenciaDireta: 15,
  aderenciaAplicacao: 25,
  contextoOculto: 20,
  modeloComercial: 15,
  potencialEconomico: 15,
  qualidadeEvidencia: 10,
}

export const FAIXAS_PADRAO: ConfigFaixas = {
  aPlus: 85,
  a: 70,
  b: 55,
  c: 40,
}

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

export function faixa(score: number, faixas: ConfigFaixas = FAIXAS_PADRAO): string {
  if (score >= faixas.aPlus) return 'A+'
  if (score >= faixas.a) return 'A'
  if (score >= faixas.b) return 'B'
  if (score >= faixas.c) return 'C'
  return 'D'
}

export function calcularScore(
  analise: AnaliseDetalhe | null,
  analiseIaResult: AnaliseIaResult | null,
  pesos: ConfigPesos = PESOS_PADRAO,
  faixasConfig: ConfigFaixas = FAIXAS_PADRAO
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
    (scoreAderenciaDireta * pesos.aderenciaDireta +
      scoreAderenciaAplicacao * pesos.aderenciaAplicacao +
      scoreContextoOculto * pesos.contextoOculto +
      scoreModeloComercial * pesos.modeloComercial +
      scorePotencialEconomico * pesos.potencialEconomico +
      scoreQualidadeEvidencia * pesos.qualidadeEvidencia) /
    100 // pesos devem somar 100 para scoreFinal ficar na escala 0-100

  return {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
    scoreFinal: Math.round(scoreFinal * 100) / 100,
    faixaClassificacao: faixa(scoreFinal, faixasConfig),
  }
}
