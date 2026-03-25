import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { db } from '@/lib/db'
import { KANBAN_COLUNA_LABELS } from '@/lib/kanban'
import { formatCurrency, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const FAIXA_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C: 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
}

async function getLicitacoes() {
  const rows = await db.licitacao.findMany({
    include: {
      card: { select: { colunaAtual: true, urgente: true } },
      score: { select: { faixaClassificacao: true, scoreFinal: true } },
    },
    orderBy: { criadoEm: 'desc' },
  })
  return rows.map((r) => ({
    ...r,
    dataSessao: r.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: r.valorGlobalEstimado ? Number(r.valorGlobalEstimado) : null,
    score: r.score
      ? { ...r.score, scoreFinal: Number(r.score.scoreFinal) }
      : null,
  }))
}

export default async function LicitacoesPage() {
  const licitacoes = await getLicitacoes()

  return (
    <>
      <TopBar title="Licitações" />
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50">
                {['Órgão', 'Nº / Modalidade', 'UF', 'Sessão', 'Valor Global', 'Faixa', 'Coluna'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-slate-500 font-medium px-3 py-2 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {licitacoes.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <Link
                      href={`/licitacoes/${l.id}`}
                      className="font-medium text-slate-900 hover:text-[#1D4ED8] hover:underline"
                    >
                      {l.orgao ?? '—'}
                    </Link>
                    {l.objetoResumido && (
                      <p className="text-slate-400 truncate max-w-xs">{l.objetoResumido}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    <p>{l.numeroLicitacao ?? '—'}</p>
                    <p className="text-slate-400">{l.modalidade ?? ''}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{l.uf ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {formatDate(l.dataSessao)}
                  </td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {formatCurrency(l.valorGlobalEstimado)}
                  </td>
                  <td className="px-3 py-2">
                    {l.score?.faixaClassificacao ? (
                      <Badge
                        className={`text-[10px] border ${
                          FAIXA_COLORS[l.score.faixaClassificacao] ?? ''
                        }`}
                      >
                        {l.score.faixaClassificacao}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {l.card?.colunaAtual
                      ? KANBAN_COLUNA_LABELS[l.card.colunaAtual]
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {licitacoes.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">
              Nenhuma licitação encontrada.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
