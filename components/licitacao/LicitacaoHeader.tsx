'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ArrowRight, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoveKanbanModal } from '@/components/kanban/MoveKanbanModal'
import { KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'
import { formatCurrency, formatDate } from '@/lib/format'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

type Props = { licitacao: LicitacaoDetalhe }

export function LicitacaoHeader({ licitacao }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const coluna = licitacao.card?.colunaAtual
  const faixa = licitacao.score?.faixaClassificacao

  async function handleMoverConfirm(colunaDestino: KanbanColuna, motivo?: string) {
    if (!licitacao.card) return
    try {
      const res = await fetch('/api/kanban/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: licitacao.card.id, colunaDestino, motivo }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao mover card')
        return
      }
      toast.success('Card movido com sucesso')
      router.refresh()
    } catch {
      toast.error('Erro de rede ao mover card')
    } finally {
      setModalOpen(false)
    }
  }

  return (
    <div className="border-b bg-white px-6 py-4">
      {/* Linha 1: Órgão + badges */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base font-semibold text-slate-900 leading-tight">
          {licitacao.orgao ?? '—'}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {coluna && (
            <Badge variant="outline" className="text-xs">
              {KANBAN_COLUNA_LABELS[coluna]}
            </Badge>
          )}
          {faixa && (
            <Badge className={`text-xs border ${FAIXA_COLORS[faixa] ?? ''}`}>
              {faixa}
            </Badge>
          )}
          {licitacao.card?.urgente && (
            <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
              <Zap className="h-3 w-3 mr-0.5" />
              URGENTE
            </Badge>
          )}
        </div>
      </div>

      {/* Linha 2: número · modalidade · UF · município */}
      <p className="text-sm text-slate-500 mt-1">
        {[licitacao.numeroLicitacao, licitacao.modalidade, licitacao.uf, licitacao.municipio]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {/* Linha 3: Objeto */}
      {licitacao.objetoResumido && (
        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{licitacao.objetoResumido}</p>
      )}

      {/* Linha 4: Valores + Sessão */}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span>Global: {formatCurrency(licitacao.valorGlobalEstimado)}</span>
        <span>Sessão: {formatDate(licitacao.dataSessao)}</span>
        {licitacao.score?.valorCapturavelEstimado !== undefined &&
          licitacao.score.valorCapturavelEstimado !== null && (
            <span>Capturável: {formatCurrency(licitacao.score.valorCapturavelEstimado)}</span>
          )}
      </div>

      {/* Linha 5: Ações */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setModalOpen(true)}
          disabled={!licitacao.card}
        >
          <ArrowRight className="h-3.5 w-3.5 mr-1" />
          Mover Kanban
        </Button>
        {licitacao.linkOrigem ? (
          <a
            href={licitacao.linkOrigem}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir Origem
          </a>
        ) : (
          <span className="text-xs text-slate-300">Sem link de origem</span>
        )}
      </div>

      <MoveKanbanModal
        open={modalOpen}
        colunaDestino={null}
        colunaAtual={coluna}
        onConfirm={handleMoverConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
