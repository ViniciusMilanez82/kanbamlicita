import type { KanbanColuna } from '@/lib/kanban'

export type KanbanMetricas = {
  captadasHoje: number
  emAnalise: number
  classificacaoAouAPlus: number
  urgentes: number
  riscoAltoFalsoNegativo: number
}

export type ScoreInfo = {
  scoreFinal: number
  faixaClassificacao: string
  valorCapturavelEstimado: number | null
  falsoNegativoNivelRisco: string
} | null

export type CardInfo = {
  id: string
  colunaAtual: KanbanColuna   // tipo forte — garante type safety no board
  urgente: boolean
  bloqueado: boolean
  motivoBloqueio: string | null
}

export type LicitacaoComCard = {
  id: string
  orgao: string | null
  numeroLicitacao: string | null
  modalidade: string | null
  objetoResumido: string | null
  uf: string | null
  municipio: string | null
  segmento: string | null
  dataSessao: string | null
  valorGlobalEstimado: number | null
  card: CardInfo
  score: ScoreInfo
}
