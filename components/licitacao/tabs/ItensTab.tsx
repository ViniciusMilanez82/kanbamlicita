import { formatCurrency } from '@/lib/format'
import type { ItemDetalhe } from '@/types/licitacao-detalhe'

type Props = { itens: ItemDetalhe[] }

const ADERENCIA_BADGE: Record<string, string> = {
  alta: 'bg-green-100 text-green-700',
  média: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-slate-100 text-slate-600',
  nenhuma: 'bg-gray-50 text-gray-400',
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  média: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-slate-100 text-slate-600',
}

export function ItensTab({ itens }: Props) {
  if (itens.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Nenhum item ou lote registrado para esta licitação.
      </div>
    )
  }

  return (
    <div className="p-6 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {['Tipo', 'ID', 'Descrição', 'Qtd', 'Unid.', 'Aderência', 'Prioridade', 'Valor Est.'].map(
              (h) => (
                <th
                  key={h}
                  className="text-left text-slate-500 font-medium pb-2 pr-3 whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {itens.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-3 text-slate-500">{item.tipo ?? '—'}</td>
              <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                {item.identificador ?? '—'}
              </td>
              <td className="py-2 pr-3 text-slate-700 max-w-xs">
                <p className="line-clamp-2">{item.descricao ?? '—'}</p>
                {item.observacoes && (
                  <p className="text-slate-400 text-[10px] mt-0.5">{item.observacoes}</p>
                )}
              </td>
              <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                {item.quantitativo ?? '—'}
              </td>
              <td className="py-2 pr-3 text-slate-500">{item.unidade ?? '—'}</td>
              <td className="py-2 pr-3">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    ADERENCIA_BADGE[item.aderencia] ?? 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {item.aderencia}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    PRIORIDADE_BADGE[item.prioridade] ?? 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {item.prioridade}
                </span>
              </td>
              <td className="py-2 text-slate-700 whitespace-nowrap">
                {formatCurrency(item.valorEstimadoItem)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
