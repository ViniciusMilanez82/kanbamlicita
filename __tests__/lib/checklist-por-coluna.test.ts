import { mergeChecklistPorColuna, getChecklistItensColuna } from '@/lib/kanban/checklist-por-coluna'

describe('mergeChecklistPorColuna', () => {
  it('retorna padrões quando armazenado é inválido', () => {
    const m = mergeChecklistPorColuna(null)
    expect(m.em_analise.length).toBeGreaterThan(0)
  })

  it('usa itens salvos quando array de strings', () => {
    const m = mergeChecklistPorColuna({
      em_analise: ['Item único salvo'],
    })
    expect(m.em_analise).toEqual(['Item único salvo'])
    expect(m.triagem_inicial.length).toBeGreaterThan(0)
  })
})

describe('getChecklistItensColuna', () => {
  it('retorna vazio sem coluna', () => {
    expect(getChecklistItensColuna(null, {})).toEqual([])
  })
})
