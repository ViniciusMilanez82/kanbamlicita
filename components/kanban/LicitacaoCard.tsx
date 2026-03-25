import { AlertTriangle, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardQuickActions } from './CardQuickActions'
import type { LicitacaoComCard } from '@/types/licitacao'

type Props = {
  licitacao: LicitacaoComCard
  onMover: () => void
}

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

const FAIXA_CARD_BG: Record<string, string> = {
  'A+': 'bg-green-50 border-green-200',
  A:   'bg-emerald-50 border-emerald-200',
  B:   'bg-yellow-50 border-yellow-200',
  C:   'bg-orange-50 border-orange-200',
  D:   'bg-red-50 border-red-200',
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return `R$ ${value}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function LicitacaoCard({ licitacao, onMover }: Props) {
  const { card, score } = licitacao
  const fnAlto = score?.falsoNegativoNivelRisco === 'alto'
  const faixa = score?.faixaClassificacao
  const scoreVal = score ? Number(score.scoreFinal) : null

  return (
    <div className={`rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs ${FAIXA_CARD_BG[faixa ?? ''] ?? 'bg-white border-slate-200'}`}>
      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {licitacao.segmento && (
          <Badge variant="outline" className="text-[10px] py-0">
            {licitacao.segmento}
          </Badge>
        )}
        {faixa && (
          <Badge className={`text-[10px] py-0 border ${FAIXA_COLORS[faixa] ?? ''}`}>
            {faixa}
          </Badge>
        )}
        {card.urgente && (
          <Badge className="text-[10px] py-0 bg-orange-100 text-orange-800 border-orange-200">
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            URGENTE
          </Badge>
        )}
        {fnAlto && (
          <Badge className="text-[10px] py-0 bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            FN!
          </Badge>
        )}
      </div>

      {/* Órgão */}
      <p className="font-medium text-slate-900 truncate">{licitacao.orgao ?? '—'}</p>

      {/* Número + Modalidade */}
      <p className="text-slate-500 truncate mt-0.5">
        {licitacao.numeroLicitacao} · {licitacao.modalidade}
      </p>

      {/* Objeto */}
      <p className="text-slate-600 mt-1 line-clamp-2">{licitacao.objetoResumido}</p>

      {/* UF + Município */}
      <p className="text-slate-400 mt-1">
        {licitacao.uf} · {licitacao.municipio}
      </p>

      {/* Data sessão */}
      <p className="text-slate-400 mt-0.5">
        Sessão: {formatDate(licitacao.dataSessao)}
      </p>

      {/* Valores */}
      <div className="flex gap-3 mt-2 text-slate-700">
        <span>Global: {formatCurrency(licitacao.valorGlobalEstimado)}</span>
        <span>Cap: {formatCurrency(score?.valorCapturavelEstimado ?? null)}</span>
      </div>

      {/* Score */}
      {scoreVal !== null ? (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-slate-500">Score: {scoreVal}</span>
            <span className="font-bold text-slate-900">{faixa}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1D4ED8] transition-all"
              style={{ width: `${scoreVal}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-slate-400 italic">Score: — · Sem classificação</p>
      )}

      {/* Ações */}
      <CardQuickActions licitacao={licitacao} onMover={onMover} />
    </div>
  )
}
