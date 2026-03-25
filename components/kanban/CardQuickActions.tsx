import { ArrowRight, Brain, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LicitacaoComCard } from '@/types/licitacao'

type Props = {
  licitacao: LicitacaoComCard
  onMover: () => void
}

export function CardQuickActions({ licitacao, onMover }: Props) {
  return (
    <div className="flex items-center gap-1 pt-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={(e) => {
          e.stopPropagation()
          onMover()
        }}
        disabled={licitacao.card.bloqueado}
        title={licitacao.card.motivoBloqueio ?? undefined}
      >
        <ArrowRight className="h-3 w-3 mr-1" />
        Mover
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-slate-400 cursor-not-allowed"
        disabled
        title="Análise por IA disponível no SP-4"
      >
        <Brain className="h-3 w-3 mr-1" />
        IA
      </Button>
      <a
        href={`/licitacoes/${licitacao.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
