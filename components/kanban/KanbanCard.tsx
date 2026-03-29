"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

interface CardData {
  id: string;
  licitacao: {
    id: string;
    titulo: string;
    orgao: string | null;
    uf: string | null;
    valorEstimado: number | null;
    dataSessao: string | null;
    modalidade: string | null;
  };
  urgente: boolean;
  responsavel: { name: string | null } | null;
}

interface KanbanCardProps {
  card: CardData;
  onClick: () => void;
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">
          {card.licitacao.titulo}
        </h3>
        {card.urgente && (
          <Badge variant="destructive" className="shrink-0 text-[10px]">Urgente</Badge>
        )}
      </div>

      {card.licitacao.orgao && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">{card.licitacao.orgao}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.licitacao.uf && (
          <Badge variant="outline" className="text-[10px]">{card.licitacao.uf}</Badge>
        )}
        {card.licitacao.modalidade && (
          <Badge variant="outline" className="text-[10px]">{card.licitacao.modalidade}</Badge>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatCurrency(card.licitacao.valorEstimado)}</span>
        <span>{formatDate(card.licitacao.dataSessao)}</span>
      </div>

      {card.responsavel?.name && (
        <p className="mt-1.5 text-[11px] text-blue-600">{card.responsavel.name}</p>
      )}
    </div>
  );
}
