/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { ItensTab } from '@/components/licitacao/tabs/ItensTab'
import type { ItemDetalhe } from '@/types/licitacao-detalhe'

const ITEM_BASE: ItemDetalhe = {
  id: '1',
  tipo: 'item',
  identificador: 'IT-01',
  descricao: 'Servidor de rack',
  quantitativo: 2,
  unidade: 'UN',
  aderencia: 'alta',
  tipoAderencia: 'direta',
  prioridade: 'alta',
  valorEstimadoItem: 15000,
  motivo: 'Produto principal do portfólio',
  observacoes: null,
}

describe('ItensTab', () => {
  it('renderiza empty state quando itens = []', () => {
    render(<ItensTab itens={[]} />)
    expect(screen.getByText(/nenhum item/i)).toBeInTheDocument()
  })

  it('renderiza coluna "Tipo Ader." com badge', () => {
    render(<ItensTab itens={[ITEM_BASE]} />)
    expect(screen.getByText('Tipo Ader.')).toBeInTheDocument()
    expect(screen.getByText('direta')).toBeInTheDocument()
  })

  it('renderiza coluna "Motivo" com texto truncado', () => {
    render(<ItensTab itens={[ITEM_BASE]} />)
    expect(screen.getByText('Motivo')).toBeInTheDocument()
    expect(screen.getByText('Produto principal do portfólio')).toBeInTheDocument()
  })

  it('renderiza "—" quando tipoAderencia é null', () => {
    const item = { ...ITEM_BASE, tipoAderencia: null, motivo: null }
    render(<ItensTab itens={[item]} />)
    // Deve ter pelo menos 2 ocorrências de "—" (tipoAderencia e motivo)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
