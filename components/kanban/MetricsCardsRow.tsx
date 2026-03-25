import { AlertTriangle, Clock, Star, TrendingUp, Zap } from 'lucide-react'
import type { KanbanMetricas } from '@/types/licitacao'

type Props = { metricas: KanbanMetricas }

const CARDS = [
  { key: 'captadasHoje', label: 'Captadas hoje', icon: TrendingUp, color: 'text-blue-600' },
  { key: 'emAnalise', label: 'Em análise', icon: Clock, color: 'text-amber-600' },
  { key: 'classificacaoAouAPlus', label: 'A+ e A', icon: Star, color: 'text-green-600' },
  { key: 'urgentes', label: 'Urgentes', icon: Zap, color: 'text-orange-600' },
  { key: 'riscoAltoFalsoNegativo', label: 'Risco alto FN', icon: AlertTriangle, color: 'text-red-600' },
] as const

export function MetricsCardsRow({ metricas }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b bg-white">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm border-t-2 border-t-[#1D4ED8]"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900 leading-none">{metricas[key]}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
