import { formatDateTime } from '@/lib/format'
import { KANBAN_COLUNA_LABELS } from '@/lib/kanban'
import type { MovimentacaoDetalhe } from '@/types/licitacao-detalhe'

type Props = { movimentacoes: MovimentacaoDetalhe[] }

function colunaLabel(coluna: string | null): string {
  if (!coluna) return '—'
  return KANBAN_COLUNA_LABELS[coluna as keyof typeof KANBAN_COLUNA_LABELS] ?? coluna
}

export function HistoricoTab({ movimentacoes }: Props) {
  if (movimentacoes.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhuma movimentação registrada.
      </div>
    )
  }

  return (
    <div className="p-6">
      <ol className="relative border-l border-slate-200 space-y-6 ml-2">
        {movimentacoes.map((mov) => (
          <li key={mov.id} className="ml-4">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-[#1D4ED8]" />
            <p className="text-xs text-slate-400">{formatDateTime(mov.criadoEm)}</p>
            <p className="text-sm text-slate-700 mt-0.5">
              <span className="text-slate-400">{colunaLabel(mov.colunaOrigem)}</span>
              {' → '}
              <span className="font-medium">{colunaLabel(mov.colunaDestino)}</span>
            </p>
            {mov.motivo && (
              <p className="text-xs text-slate-500 mt-0.5 italic">&ldquo;{mov.motivo}&rdquo;</p>
            )}
            <p className="text-[10px] text-slate-300 mt-0.5">
              {mov.automatico ? 'Automático' : 'Manual'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
