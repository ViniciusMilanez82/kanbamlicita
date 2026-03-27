import type { SinalDetalhe } from '@/types/licitacao-detalhe'

const NIVEL_BADGE: Record<string, string> = {
  alto: 'bg-red-100 text-red-700',
  médio: 'bg-yellow-100 text-yellow-700',
  baixo: 'bg-slate-100 text-slate-600',
}

const RELEVANCIA_BADGE: Record<string, string> = {
  alta: 'bg-blue-100 text-blue-700',
  média: 'bg-slate-100 text-slate-600',
  baixa: 'bg-gray-50 text-gray-400',
}

type Props = { sinais: SinalDetalhe[] }

export function SinaisTab({ sinais }: Props) {
  if (sinais.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhum sinal identificado para esta licitação.
      </div>
    )
  }

  const grupos = sinais.reduce<Record<string, SinalDetalhe[]>>((acc, s) => {
    if (!acc[s.categoria]) acc[s.categoria] = []
    acc[s.categoria].push(s)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      {Object.entries(grupos).map(([categoria, itens]) => (
        <section key={categoria}>
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            {categoria}
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {['Subcategoria', 'Sinal', 'Nível', 'Relevância', 'Trecho', 'Fonte Doc.'].map((h) => (
                  <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{s.subcategoria ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-700 max-w-xs">
                    <p className="line-clamp-3">{s.sinal}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {s.nivel ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${NIVEL_BADGE[s.nivel] ?? 'bg-gray-50 text-gray-400'}`}>
                        {s.nivel}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {s.relevancia ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${RELEVANCIA_BADGE[s.relevancia] ?? 'bg-gray-50 text-gray-400'}`}>
                        {s.relevancia}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-500 max-w-[200px]">
                    {s.trecho ? (
                      <span title={s.trecho} className="block truncate">{s.trecho}</span>
                    ) : '—'}
                  </td>
                  <td className="py-2 text-slate-400">{s.fonteDocumento ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
