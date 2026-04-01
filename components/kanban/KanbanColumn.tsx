"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

interface CardData {
  id: string;
  licitacao: {
    id: string;
    numero: number;
    titulo: string;
    orgao: string | null;
    uf: string | null;
    valorEstimado: number | null;
    dataSessao: string | null;
    dataPublicacao: string | null;
    modalidade: string | null;
    scorePreliminar: number | null;
    classificacaoPreliminar: string | null;
    fonte: { tipo: string; nome: string } | null;
  };
  urgente: boolean;
  responsavel: { name: string | null } | null;
}

interface ColumnData {
  id: string;
  nome: string;
  cor: string;
  cards: CardData[];
}

interface KanbanColumnProps {
  column: ColumnData;
  onCardClick: (licitacaoId: string) => void;
}

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-lg transition-all duration-150
        ${isOver ? "bg-blue-50 ring-2 ring-blue-400 scale-[1.01]" : "bg-slate-50"}
      `}
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
        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors duration-150
          ${isOver ? "bg-blue-50/50" : ""}
          ${column.cards.length === 0 ? "min-h-[80px]" : ""}
        `}
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

        {column.cards.length === 0 && !isOver && (
          <p className="py-4 text-center text-xs text-slate-400">
            Arraste cards para cá
          </p>
        )}
      </div>
    </div>
  );
}
