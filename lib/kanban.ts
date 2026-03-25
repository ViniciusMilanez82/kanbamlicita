// ─── Colunas canônicas ────────────────────────────────────────────────────────
export const KANBAN_COLUNAS = [
  'captadas_automaticamente',
  'triagem_inicial',
  'em_analise',
  'viavel_comercialmente',
  'proposta_documentacao',
  'enviadas_participando',
  'ganhamos',
  'perdemos',
  'descartadas',
] as const

export type KanbanColuna = (typeof KANBAN_COLUNAS)[number]

export const KANBAN_COLUNA_LABELS: Record<KanbanColuna, string> = {
  captadas_automaticamente: 'Captadas Automaticamente',
  triagem_inicial: 'Triagem Inicial',
  em_analise: 'Em Análise',
  viavel_comercialmente: 'Viável Comercialmente',
  proposta_documentacao: 'Proposta / Documentação',
  enviadas_participando: 'Enviadas / Participando',
  ganhamos: 'Ganhamos',
  perdemos: 'Perdemos',
  descartadas: 'Descartadas',
}

// ─── Erros de validação ───────────────────────────────────────────────────────
export type KanbanMoveErrorCode =
  | 'COLUNA_INVALIDA'
  | 'MOTIVO_OBRIGATORIO'
  | 'FALSO_NEGATIVO_BLOQUEIO'

export class KanbanMoveError extends Error {
  constructor(public code: KanbanMoveErrorCode, message: string) {
    super(message)
    this.name = 'KanbanMoveError'
  }
}

// ─── Colunas que exigem motivo ────────────────────────────────────────────────
const COLUNAS_QUE_EXIGEM_MOTIVO: KanbanColuna[] = ['descartadas', 'perdemos']

// ─── Validação de movimento ───────────────────────────────────────────────────
export function validateMove(input: {
  colunaDestino: string
  falsoNegativoNivelRisco: string
  motivo: string | undefined
}): void {
  const { colunaDestino, falsoNegativoNivelRisco, motivo } = input

  if (!KANBAN_COLUNAS.includes(colunaDestino as KanbanColuna)) {
    throw new KanbanMoveError('COLUNA_INVALIDA', `Coluna inválida: ${colunaDestino}`)
  }

  const coluna = colunaDestino as KanbanColuna

  if (coluna === 'descartadas' && falsoNegativoNivelRisco === 'alto') {
    throw new KanbanMoveError(
      'FALSO_NEGATIVO_BLOQUEIO',
      'Esta licitação possui risco alto de falso negativo. Revisão humana obrigatória antes de descartar.'
    )
  }

  if (COLUNAS_QUE_EXIGEM_MOTIVO.includes(coluna) && !motivo?.trim()) {
    throw new KanbanMoveError(
      'MOTIVO_OBRIGATORIO',
      `Mover para "${KANBAN_COLUNA_LABELS[coluna]}" exige preenchimento do motivo.`
    )
  }
}
