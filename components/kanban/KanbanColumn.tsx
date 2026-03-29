"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

interface ColumnData {
  id: string;
  nome: string;
  cor: string;
  cards: Array<{
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
  }>;
}

interface KanbanColumnProps {
  column: ColumnData;
  onCardClick: (licitacaoId: string) => void;
}

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-slate-50 ${isOver ? "ring-2 ring-blue-400" : ""}`}
    >
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2"
        style={{ backgroundColor: column.cor }}
      >
        <span className="text-sm font-semibold text-white">{column.nome}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
          {column.cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.licitacao.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
