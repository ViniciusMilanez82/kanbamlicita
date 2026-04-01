"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

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

interface KanbanCardProps {
  card: CardData;
  onClick: () => void;
}

const FONTE_CONFIG: Record<string, { label: string; cor: string }> = {
  pncp: { label: "PNCP", cor: "bg-blue-100 text-blue-700 ring-blue-200" },
  petronect: { label: "Petronect", cor: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

function FonteBadge({ fonte }: { fonte: { tipo: string; nome: string } | null }) {
  if (!fonte) return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 bg-slate-100 text-slate-600 ring-slate-200">
      Manual
    </span>
  );
  const config = FONTE_CONFIG[fonte.tipo] ?? { label: fonte.tipo, cor: "bg-slate-100 text-slate-600 ring-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${config.cor}`}>
      {config.label}
    </span>
  );
}

const CLASSIFICACAO_CORES: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800 ring-emerald-200",
  A: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  B: "bg-blue-50 text-blue-700 ring-blue-100",
  C: "bg-amber-50 text-amber-700 ring-amber-100",
  D: "bg-rose-50 text-rose-700 ring-rose-100",
};

function ClassificacaoBadge({
  classificacao,
  score,
}: {
  classificacao: string | null;
  score: number | null;
}) {
  if (!classificacao) return null;
  const cor = CLASSIFICACAO_CORES[classificacao] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${cor}`}
      title={`Score preliminar: ${score ?? "?"}%`}
    >
      {classificacao}
      {score != null && (
        <span className="font-normal opacity-70">{score}%</span>
      )}
    </span>
  );
}

/** Card arrastavel dentro da coluna */
export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e as any);
      }}
      onPointerUp={(e) => {
        if (!pointerStart.current) return;
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        pointerStart.current = null;
        if (dx < 5 && dy < 5) {
          onClick();
        }
      }}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow touch-none
        ${isDragging ? "cursor-grabbing shadow-lg ring-2 ring-blue-300" : "hover:shadow-md"}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
          #{card.licitacao.numero}
        </span>
        <FonteBadge fonte={card.licitacao.fonte} />
        {card.urgente && (
          <Badge variant="destructive" className="shrink-0 text-[10px]">
            Urgente
          </Badge>
        )}
        <ClassificacaoBadge
          classificacao={card.licitacao.classificacaoPreliminar}
          score={card.licitacao.scorePreliminar}
        />
      </div>
      <h3 className="text-sm font-medium leading-tight line-clamp-2">
        {card.licitacao.titulo}
      </h3>

      {card.licitacao.orgao && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {card.licitacao.orgao}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.licitacao.uf && (
          <Badge variant="outline" className="text-[10px]">
            {card.licitacao.uf}
          </Badge>
        )}
        {card.licitacao.modalidade && (
          <Badge variant="outline" className="text-[10px]">
            {card.licitacao.modalidade}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatCurrency(card.licitacao.valorEstimado)}</span>
        {(card.licitacao.dataSessao || card.licitacao.dataPublicacao) && (
          <span>
            {card.licitacao.dataSessao
              ? `Sessao: ${formatDate(card.licitacao.dataSessao)}`
              : `Publicacao: ${formatDate(card.licitacao.dataPublicacao)}`}
          </span>
        )}
      </div>

      {card.responsavel?.name && (
        <p className="mt-1.5 text-[11px] text-blue-600">
          {card.responsavel.name}
        </p>
      )}
    </div>
  );
}

/** Versao do card usada no DragOverlay (visual de arrastar) */
export function KanbanCardOverlay({ card }: { card: CardData }) {
  return (
    <div className="w-64 rounded-lg border-2 border-blue-400 bg-white p-3 shadow-xl rotate-2 scale-105">
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
          #{card.licitacao.numero}
        </span>
        <FonteBadge fonte={card.licitacao.fonte} />
        <ClassificacaoBadge
          classificacao={card.licitacao.classificacaoPreliminar}
          score={card.licitacao.scorePreliminar}
        />
      </div>
      <h3 className="mt-1 text-sm font-medium leading-tight line-clamp-2">
        {card.licitacao.titulo}
      </h3>

      {card.licitacao.orgao && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {card.licitacao.orgao}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatCurrency(card.licitacao.valorEstimado)}</span>
        {(card.licitacao.dataSessao || card.licitacao.dataPublicacao) && (
          <span>
            {formatDate(
              card.licitacao.dataSessao ?? card.licitacao.dataPublicacao
            )}
          </span>
        )}
      </div>
    </div>
  );
}
