'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KanbanColumn } from './KanbanColumn'
import { LicitacaoCard } from './LicitacaoCard'
import { MoveKanbanModal } from './MoveKanbanModal'
import { FilterBar, type FiltrosKanban } from './FilterBar'
import { MetricsCardsRow } from './MetricsCardsRow'
import { KANBAN_COLUNAS, KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'
import type { LicitacaoComCard, KanbanMetricas } from '@/types/licitacao'

const FILTROS_INICIAIS: FiltrosKanban = {
  busca: '',
  segmento: 'todos',
  classificacao: 'todas',
  uf: 'todas',
  urgentes: false,
  riscoAltoFn: false,
}

type MoveState = {
  licitacao: LicitacaoComCard
  colunaDestino: KanbanColuna | null   // null quando aberto pelo botão (sem destino pré-definido)
} | null

export function KanbanBoard({ initialData }: { initialData: LicitacaoComCard[] }) {
  const queryClient = useQueryClient()
  const [filtros, setFiltros] = useState<FiltrosKanban>(FILTROS_INICIAIS)
  const [activeDrag, setActiveDrag] = useState<LicitacaoComCard | null>(null)
  const [pendingMove, setPendingMove] = useState<MoveState>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data } = useQuery<{ licitacoes: LicitacaoComCard[] }>({
    queryKey: ['licitacoes'],
    queryFn: () => fetch('/api/licitacoes').then((r) => r.json()),
    initialData: { licitacoes: initialData },
    staleTime: 30_000,
  })

  const { data: metricasData } = useQuery<KanbanMetricas>({
    queryKey: ['kanban-metricas'],
    queryFn: () => fetch('/api/kanban/metricas').then((r) => r.json()),
  })

  const moverMutation = useMutation({
    mutationFn: async (input: { cardId: string; colunaDestino: string; motivo?: string }) => {
      const res = await fetch('/api/kanban/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erro ao mover card')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metricas'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const licitacoes = data?.licitacoes ?? initialData

  const licitacoesFiltradas = useMemo(() => {
    return licitacoes.filter((l) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase()
        const noObjeto = l.objetoResumido?.toLowerCase().includes(termo)
        const noOrgao = l.orgao?.toLowerCase().includes(termo)
        if (!noObjeto && !noOrgao) return false
      }
      if (filtros.segmento !== 'todos' && l.segmento !== filtros.segmento) return false
      if (filtros.classificacao !== 'todas' && l.score?.faixaClassificacao !== filtros.classificacao) return false
      if (filtros.uf !== 'todas' && l.uf !== filtros.uf) return false
      if (filtros.urgentes && !l.card.urgente) return false
      if (filtros.riscoAltoFn && l.score?.falsoNegativoNivelRisco !== 'alto') return false
      return true
    })
  }, [licitacoes, filtros])

  const porColuna = useMemo(() => {
    const map: Record<KanbanColuna, LicitacaoComCard[]> = {} as never
    KANBAN_COLUNAS.forEach((c) => { map[c] = [] })
    licitacoesFiltradas.forEach((l) => {
      const coluna = l.card.colunaAtual as KanbanColuna
      if (map[coluna]) map[coluna].push(l)
    })
    return map
  }, [licitacoesFiltradas])

  const segmentosDisponiveis = useMemo(() =>
    [...new Set(licitacoes.map((l) => l.segmento).filter(Boolean))] as string[],
    [licitacoes]
  )
  const ufsDisponiveis = useMemo(() =>
    [...new Set(licitacoes.map((l) => l.uf).filter(Boolean))].sort() as string[],
    [licitacoes]
  )

  function onDragStart(event: DragStartEvent) {
    const l = licitacoes.find((l) => l.id === event.active.id)
    if (l) setActiveDrag(l)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const colunaDestino = over.id as KanbanColuna
    const licitacao = licitacoes.find((l) => l.id === active.id)
    if (!licitacao) return
    if (licitacao.card.colunaAtual === colunaDestino) return

    if (colunaDestino === 'descartadas' && licitacao.score?.falsoNegativoNivelRisco === 'alto') {
      toast.error('Falso negativo alto: revisão humana obrigatória antes de descartar.')
      return
    }

    if (colunaDestino === 'descartadas' || colunaDestino === 'perdemos') {
      setPendingMove({ licitacao, colunaDestino })
      return
    }

    if (colunaDestino === 'viavel_comercialmente' && !licitacao.score) {
      toast.warning('Este card ainda não tem score calculado. Preencha o score antes de prosseguir comercialmente.', {
        duration: 6000,
      })
    }

    moverMutation.mutate({ cardId: licitacao.card.id, colunaDestino })
  }

  function handleModalConfirm(colunaDestino: KanbanColuna, motivo?: string) {
    if (!pendingMove) return

    if (colunaDestino === 'viavel_comercialmente' && !pendingMove.licitacao.score) {
      toast.warning('Este card ainda não tem score calculado. Preencha o score antes de prosseguir comercialmente.', {
        duration: 6000,
      })
    }

    moverMutation.mutate({
      cardId: pendingMove.licitacao.card.id,
      colunaDestino,
      motivo,
    })
    setPendingMove(null)
  }

  const metricas: KanbanMetricas = metricasData ?? {
    captadasHoje: 0, emAnalise: 0, classificacaoAouAPlus: 0, urgentes: 0, riscoAltoFalsoNegativo: 0,
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <MetricsCardsRow metricas={metricas} />

      <FilterBar
        filtros={filtros}
        onChange={setFiltros}
        segmentosDisponiveis={segmentosDisponiveis}
        ufsDisponiveis={ufsDisponiveis}
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext id="kanban-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full">
            {KANBAN_COLUNAS.map((coluna) => (
              <KanbanColumn
                key={coluna}
                coluna={coluna}
                label={KANBAN_COLUNA_LABELS[coluna]}
                licitacoes={porColuna[coluna]}
                onMoverCard={(l) => setPendingMove({ licitacao: l, colunaDestino: null })}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDrag && (
              <div className="rotate-2 opacity-90 w-64">
                <LicitacaoCard licitacao={activeDrag} onMover={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <MoveKanbanModal
        open={!!pendingMove}
        colunaDestino={pendingMove?.colunaDestino ?? null}
        colunaAtual={pendingMove?.licitacao.card.colunaAtual}
        onConfirm={handleModalConfirm}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  )
}
