/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { LicitacaoCard } from '@/components/kanban/LicitacaoCard'
import type { LicitacaoComCard } from '@/types/licitacao'

const BASE: LicitacaoComCard = {
  id: '1',
  orgao: 'Órgão Teste',
  numeroLicitacao: '001/2026',
  modalidade: 'Pregão',
  objetoResumido: 'Objeto teste',
  uf: 'SP',
  municipio: 'São Paulo',
  segmento: 'TI',
  dataSessao: null,
  valorGlobalEstimado: null,
  score: null,
  card: {
    id: 'card-1',
    colunaAtual: 'captadas_automaticamente',
    urgente: false,
    bloqueado: false,
    motivoBloqueio: null,
    responsavel: null,
  },
}

describe('LicitacaoCard — responsável', () => {
  it('renderiza "Sem responsável" quando card.responsavel = null', () => {
    render(<LicitacaoCard licitacao={BASE} onMover={() => {}} />)
    expect(screen.getByText(/sem responsável/i)).toBeInTheDocument()
  })

  it('renderiza o nome do responsável quando atribuído', () => {
    const comResponsavel: LicitacaoComCard = {
      ...BASE,
      card: { ...BASE.card, responsavel: { id: 'u1', name: 'João Silva' } },
    }
    render(<LicitacaoCard licitacao={comResponsavel} onMover={() => {}} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })
})
