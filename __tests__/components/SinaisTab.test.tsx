/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { SinaisTab } from '@/components/licitacao/tabs/SinaisTab'
import type { SinalDetalhe } from '@/types/licitacao-detalhe'

const BASE: SinalDetalhe = {
  id: '1',
  categoria: 'tecnologia',
  subcategoria: 'software',
  sinal: 'Equipamento de TI avançado',
  nivel: 'alto',
  trecho: 'Conforme item 3.2 do edital...',
  fonteDocumento: 'edital.pdf',
  relevancia: 'alta',
  criadoEm: '2026-01-01T00:00:00.000Z',
}

describe('SinaisTab', () => {
  it('renderiza empty state quando sinais = []', () => {
    render(<SinaisTab sinais={[]} />)
    expect(screen.getByText(/nenhum sinal identificado/i)).toBeInTheDocument()
  })

  it('renderiza cabeçalho da categoria', () => {
    render(<SinaisTab sinais={[BASE]} />)
    expect(screen.getByText('tecnologia')).toBeInTheDocument()
  })

  it('renderiza 2 seções para 2 categorias distintas', () => {
    const sinais: SinalDetalhe[] = [
      { ...BASE, id: '1', categoria: 'tecnologia' },
      { ...BASE, id: '2', categoria: 'logistica' },
    ]
    render(<SinaisTab sinais={sinais} />)
    expect(screen.getByText('tecnologia')).toBeInTheDocument()
    expect(screen.getByText('logistica')).toBeInTheDocument()
  })

  it('badge de nível "alto" tem classe bg-red-100', () => {
    render(<SinaisTab sinais={[BASE]} />)
    const badge = screen.getByText('alto')
    expect(badge.className).toContain('bg-red-100')
  })
})
