"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { FilterBar } from "./FilterBar";
import { LicitacaoDrawer } from "@/components/detalhe/LicitacaoDrawer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [drawerLicitacaoId, setDrawerLicitacaoId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: colunas = [] } = useQuery({
    queryKey: ["colunas"],
    queryFn: () => fetch("/api/colunas").then((r) => r.json()),
  });

  const { data: licitacoes = [] } = useQuery({
    queryKey: ["licitacoes"],
    queryFn: () => fetch("/api/licitacoes").then((r) => r.json()),
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
      toast.success("Card movido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const colunasComCards = useMemo(() => {
    const buscaLower = busca.toLowerCase();
    return colunas.map((col: { id: string; nome: string; cor: string }) => ({
      ...col,
      cards: licitacoes
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
    }));
  }, [colunas, licitacoes, busca]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const colunaDestinoId = over.id as string;
    const cardId = active.id as string;

    const colDestino = colunas.find((c: { id: string }) => c.id === colunaDestinoId);
    if (colDestino?.tipo === "final_negativo") {
      const motivo = prompt("Motivo para mover para " + colDestino.nome + ":");
      if (!motivo) return;
      moverMutation.mutate({ cardId, colunaDestinoId, motivo });
    } else {
      moverMutation.mutate({ cardId, colunaDestinoId });
    }
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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {colunasComCards.map((col: any) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onCardClick={(licitacaoId: string) => setDrawerLicitacaoId(licitacaoId)}
            />
          ))}
        </div>
      </DndContext>

      {drawerLicitacaoId && (
        <LicitacaoDrawer
          licitacaoId={drawerLicitacaoId}
          onClose={() => setDrawerLicitacaoId(null)}
        />
      )}
    </div>
  );
}
