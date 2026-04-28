import { mergeChecklistPorColuna, getChecklistItensColuna } from '@/lib/kanban/checklist-por-coluna'

describe('mergeChecklistPorColuna', () => {
  it('retorna padrões quando armazenado é null', () => {
    const m = mergeChecklistPorColuna(null)
    expect(m['Análise'].length).toBeGreaterThan(0)
    expect(m['Captação'].length).toBeGreaterThan(0)
  })

  it('retorna padrões quando armazenado não é objeto', () => {
    const m = mergeChecklistPorColuna('texto')
    expect(m['Análise'].length).toBeGreaterThan(0)
  })

  it('usa itens salvos quando array de strings, mantendo padrões nas outras', () => {
    const m = mergeChecklistPorColuna({
      'Análise': ['Item único salvo'],
    })
    expect(m['Análise']).toEqual(['Item único salvo'])
    expect(m['Captação'].length).toBeGreaterThan(0)
  })

  it('inclui colunas extras presentes no armazenado mesmo fora do padrão', () => {
    const m = mergeChecklistPorColuna({
      'Coluna Custom': ['A', 'B'],
    })
    expect(m['Coluna Custom']).toEqual(['A', 'B'])
    expect(m['Captação'].length).toBeGreaterThan(0)
  })
})

describe('getChecklistItensColuna', () => {
  it('retorna vazio sem coluna', () => {
    expect(getChecklistItensColuna(null, {})).toEqual([])
  })

  it('retorna itens da coluna pedida', () => {
    const itens = getChecklistItensColuna('Análise', null)
    expect(itens.length).toBeGreaterThan(0)
  })

  it('retorna vazio para coluna inexistente', () => {
    expect(getChecklistItensColuna('Inexistente', null)).toEqual([])
  })
})
