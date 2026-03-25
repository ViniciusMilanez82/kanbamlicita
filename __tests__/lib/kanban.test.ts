import {
  KANBAN_COLUNAS,
  KANBAN_COLUNA_LABELS,
  validateMove,
  KanbanMoveError,
} from '@/lib/kanban'

describe('KANBAN_COLUNAS', () => {
  it('deve ter exatamente 9 colunas', () => {
    expect(KANBAN_COLUNAS).toHaveLength(9)
  })

  it('deve incluir todas as colunas esperadas', () => {
    expect(KANBAN_COLUNAS).toContain('captadas_automaticamente')
    expect(KANBAN_COLUNAS).toContain('descartadas')
    expect(KANBAN_COLUNAS).toContain('ganhamos')
  })
})

describe('validateMove', () => {
  const baseInput = {
    colunaDestino: 'triagem_inicial' as const,
    falsoNegativoNivelRisco: 'baixo',
    motivo: undefined as string | undefined,
  }

  it('permite mover para coluna válida sem restrições', () => {
    expect(() => validateMove(baseInput)).not.toThrow()
  })

  it('lança COLUNA_INVALIDA para slug desconhecido', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'coluna_inexistente' as never })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'coluna_inexistente' as never })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('COLUNA_INVALIDA')
    }
  })

  it('lança MOTIVO_OBRIGATORIO ao mover para descartadas sem motivo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: undefined })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: undefined })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('MOTIVO_OBRIGATORIO')
    }
  })

  it('lança MOTIVO_OBRIGATORIO ao mover para perdemos sem motivo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'perdemos', motivo: undefined })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({ ...baseInput, colunaDestino: 'perdemos', motivo: undefined })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('MOTIVO_OBRIGATORIO')
    }
  })

  it('permite mover para descartadas com motivo preenchido e FN baixo', () => {
    expect(() =>
      validateMove({ ...baseInput, colunaDestino: 'descartadas', motivo: 'Fora do escopo' })
    ).not.toThrow()
  })

  it('lança FALSO_NEGATIVO_BLOQUEIO ao mover para descartadas com FN alto', () => {
    expect(() =>
      validateMove({
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Qualquer motivo',
      })
    ).toThrow(KanbanMoveError)

    try {
      validateMove({
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Qualquer motivo',
      })
    } catch (e) {
      expect((e as KanbanMoveError).code).toBe('FALSO_NEGATIVO_BLOQUEIO')
    }
  })

  it('permite mover para perdemos com FN alto (FN não bloqueia perdemos)', () => {
    expect(() =>
      validateMove({
        colunaDestino: 'perdemos',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Perdemos o contrato',
      })
    ).not.toThrow()
  })
})
