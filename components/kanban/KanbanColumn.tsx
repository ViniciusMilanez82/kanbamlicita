import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LicitacaoCard } from './LicitacaoCard'
import type { KanbanColuna } from '@/lib/kanban'
import type { LicitacaoComCard } from '@/types/licitacao'

function SortableCard({
  licitacao,
  onMover,
}: {
  licitacao: LicitacaoComCard
  onMover: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: licitacao.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LicitacaoCard licitacao={licitacao} onMover={onMover} />
    </div>
  )
}

type Props = {
  coluna: KanbanColuna
  label: string
  licitacoes: LicitacaoComCard[]
  onMoverCard: (licitacao: LicitacaoComCard) => void
}

export function KanbanColumn({ coluna, label, licitacoes, onMoverCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna })

  return (
    <div className="flex w-64 flex-shrink-0 flex-col">
      {/* Cabeçalho da coluna */}
      <div className="flex items-center justify-between px-2 py-2 rounded-t-lg bg-[#1D4ED8] border border-b-0 border-[#1D4ED8]">
        <h2 className="text-xs font-semibold text-white truncate">{label}</h2>
        <span className="ml-2 rounded-full bg-blue-900 px-1.5 py-0.5 text-[10px] font-medium text-blue-100">
          {licitacoes.length}
        </span>
      </div>

      {/* Área de drop */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-b-lg border p-2 flex-1 min-h-16 transition-colors ${
          isOver ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <SortableContext
          items={licitacoes.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {licitacoes.map((l) => (
            <SortableCard
              key={l.id}
              licitacao={l}
              onMover={() => onMoverCard(l)}
            />
          ))}
        </SortableContext>

        {licitacoes.length === 0 && (
          <p className="text-center text-[10px] text-slate-300 py-4">Vazia</p>
        )}
      </div>
    </div>
  )
}
