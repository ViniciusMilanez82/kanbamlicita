"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, KanbanCardOverlay } from "./KanbanCard";
import { FilterBar } from "./FilterBar";
import { LicitacaoDrawer } from "@/components/detalhe/LicitacaoDrawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

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

interface ColunaData {
  id: string;
  nome: string;
  cor: string;
  tipo?: string;
  cards: CardData[];
}

/** Encontra a coluna de destino — over.id pode ser uma coluna ou um card */
function resolveDestinoColuna(
  overId: string,
  colunas: ColunaData[]
): ColunaData | null {
  // Primeiro tenta encontrar como coluna diretamente
  const colDir = colunas.find((c) => c.id === overId);
  if (colDir) return colDir;

  // Senão, procura qual coluna contém o card com esse id
  for (const col of colunas) {
    if (col.cards.some((card) => card.id === overId)) {
      return col;
    }
  }
  return null;
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [drawerLicitacaoId, setDrawerLicitacaoId] = useState<string | null>(null);

  // Drag state
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const isDraggingRef = useRef(false);

  // Modal de motivo (substitui prompt do navegador)
  const [motivoDialog, setMotivoDialog] = useState<{
    cardId: string;
    colunaDestinoId: string;
    colunaNome: string;
  } | null>(null);
  const [motivoTexto, setMotivoTexto] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { data: colunas = [] } = useQuery({
    queryKey: ["colunas"],
    queryFn: async () => {
      const r = await fetch("/api/colunas");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar colunas");
      return data;
    },
  });

  const { data: licitacoes = [] } = useQuery({
    queryKey: ["licitacoes"],
    queryFn: async () => {
      const r = await fetch("/api/licitacoes");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar licitações");
      return data;
    },
  });

  const moverMutation = useMutation({
    mutationFn: (data: { cardId: string; colunaDestinoId: string; motivo?: string }) =>
      fetch("/api/kanban/mover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
    },
    onError: (e: Error) => {
      // Reverte atualização otimista
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.error(e.message);
    },
  });

  const colunasComCards = useMemo(() => {
    const cols = Array.isArray(colunas) ? colunas : [];
    const lic = Array.isArray(licitacoes) ? licitacoes : [];
    const buscaLower = busca.toLowerCase();
    return cols.map((col: { id: string; nome: string; cor: string; tipo?: string }) => ({
      ...col,
      cards: lic
        .filter((l: { card: { colunaId: string } | null }) => l.card?.colunaId === col.id)
        .filter((l: { titulo: string; orgao: string | null; objeto: string | null }) =>
          !busca ||
          l.titulo.toLowerCase().includes(buscaLower) ||
          l.orgao?.toLowerCase().includes(buscaLower) ||
          l.objeto?.toLowerCase().includes(buscaLower)
        )
        .map((l: any) => ({
          id: l.card!.id,
          licitacao: {
            id: l.id,
            titulo: l.titulo,
            orgao: l.orgao,
            uf: l.uf,
            valorEstimado: l.valorEstimado,
            dataSessao: l.dataSessao,
            modalidade: l.modalidade,
          },
          urgente: l.card!.urgente,
          responsavel: l.card!.responsavel,
        })),
    })) as ColunaData[];
  }, [colunas, licitacoes, busca]);

  /** Atualização otimista: move o card localmente no cache */
  const moverOtimista = useCallback(
    (cardId: string, colunaDestinoId: string) => {
      queryClient.setQueryData(["licitacoes"], (old: any[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((l) => {
          if (l.card?.id === cardId) {
            return { ...l, card: { ...l.card, colunaId: colunaDestinoId } };
          }
          return l;
        });
      });
    },
    [queryClient]
  );

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    const cardId = event.active.id as string;
    // Encontra o card ativo para mostrar no overlay
    for (const col of colunasComCards) {
      const found = col.cards.find((c) => c.id === cardId);
      if (found) {
        setActiveCard(found);
        break;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    // Pequeno delay para não disparar click após drag
    setTimeout(() => { isDraggingRef.current = false; }, 100);

    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const colDestino = resolveDestinoColuna(over.id as string, colunasComCards);
    if (!colDestino) return;

    // Verifica se o card já está nessa coluna
    const colunaOrigem = colunasComCards.find((c) =>
      c.cards.some((card) => card.id === cardId)
    );
    if (colunaOrigem?.id === colDestino.id) return;

    if (colDestino.tipo === "final_negativo") {
      // Abre modal para pedir motivo
      setMotivoDialog({
        cardId,
        colunaDestinoId: colDestino.id,
        colunaNome: colDestino.nome,
      });
    } else {
      // Move direto com atualização otimista
      moverOtimista(cardId, colDestino.id);
      moverMutation.mutate({ cardId, colunaDestinoId: colDestino.id });
    }
  }

  function handleDragCancel() {
    setActiveCard(null);
    setTimeout(() => { isDraggingRef.current = false; }, 100);
  }

  function confirmarMotivo() {
    if (!motivoDialog || !motivoTexto.trim()) {
      toast.error("Informe o motivo para mover o card.");
      return;
    }
    moverOtimista(motivoDialog.cardId, motivoDialog.colunaDestinoId);
    moverMutation.mutate({
      cardId: motivoDialog.cardId,
      colunaDestinoId: motivoDialog.colunaDestinoId,
      motivo: motivoTexto.trim(),
    });
    setMotivoDialog(null);
    setMotivoTexto("");
  }

  function cancelarMotivo() {
    setMotivoDialog(null);
    setMotivoTexto("");
  }

  function handleCardClick(licitacaoId: string) {
    if (isDraggingRef.current) return;
    setDrawerLicitacaoId(licitacaoId);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <FilterBar busca={busca} onBuscaChange={setBusca} />
        <Button
          size="sm"
          onClick={() => setDrawerLicitacaoId("nova")}
          className="shrink-0"
        >
          <Plus className="mr-1 h-4 w-4" /> Nova Licitação
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {colunasComCards.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeCard ? <KanbanCardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de motivo (substitui prompt do navegador) */}
      <Dialog open={!!motivoDialog} onOpenChange={(open) => !open && cancelarMotivo()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo da movimentação</DialogTitle>
            <DialogDescription>
              Por que este card está sendo movido para{" "}
              <strong>{motivoDialog?.colunaNome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: Licitação cancelada pelo órgão, prazo expirado..."
            value={motivoTexto}
            onChange={(e) => setMotivoTexto(e.target.value)}
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelarMotivo}>
              Cancelar
            </Button>
            <Button onClick={confirmarMotivo} disabled={!motivoTexto.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drawerLicitacaoId && (
        <LicitacaoDrawer
          licitacaoId={drawerLicitacaoId}
          onClose={() => setDrawerLicitacaoId(null)}
        />
      )}
    </div>
  );
}
