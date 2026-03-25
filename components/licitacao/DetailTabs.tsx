import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = {
  key: string
  label: string
  badge?: string
}

const TABS: Tab[] = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'itens', label: 'Itens / Lotes' },
  { key: 'analise', label: 'Análise' },
  { key: 'historico', label: 'Histórico' },
  { key: 'ia', label: 'IA', badge: 'SP-4' },
  { key: 'score', label: 'Score', badge: 'SP-5' },
  { key: 'parecer', label: 'Parecer', badge: 'SP-5' },
]

type Props = {
  id: string
  activeTab: string
}

export function DetailTabs({ id, activeTab }: Props) {
  return (
    <div className="border-b bg-white px-6">
      <div className="flex gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          const isFuture = !!tab.badge
          return (
            <Link
              key={tab.key}
              href={`/licitacoes/${id}?tab=${tab.key}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : isFuture
                  ? 'border-transparent text-slate-300 hover:text-slate-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className="text-[10px] bg-slate-100 text-slate-400 rounded px-1 py-0.5">
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
