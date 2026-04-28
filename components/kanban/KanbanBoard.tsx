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
import { KanbanCardOverlay, type CardData } from "./KanbanCard";
import { FilterBar, type Filtros } from "./FilterBar";
import { getChecklistItensColuna } from "@/lib/kanban/checklist-por-coluna";
import { LicitacaoDrawer } from "@/components/detalhe/LicitacaoDrawer";
import { MoverCardModal } from "./MoverCardModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { KanbanColuna } from "@/types/licitacao";

interface ColunaData {
  id: string;
  nome: string;
  cor: string;
  tipo?: string;
  cards: CardData[];
}

interface LicitacaoListaItem {
  id: string;
  numero: string | null;
  titulo: string;
  orgao: string | null;
  uf: string | null;
  objeto: string | null;
  valorEstimado: number | string | null;
  dataSessao: string | null;
  dataPublicacao: string | null;
  modalidade: string | null;
  scorePreliminar: number | null;
  classificacaoPreliminar: string | null;
  fonte: { tipo: string; nome: string } | null;
  score: unknown;
  card: {
    id: string;
    colunaId: string;
    urgente: boolean;
    responsavel: { id: string; name: string | null } | null;
    checklistPorColuna: unknown;
    checklistProgresso: unknown;
  } | null;
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
  const [filtros, setFiltros] = useState<Filtros>({
    busca: "",
    uf: "",
    modalidade: "",
    urgente: "todos",
  });
  const [drawerLicitacaoId, setDrawerLicitacaoId] = useState<string | null>(null);

  // Drag state
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const isDraggingRef = useRef(false);

  // Modal de mover card (resultado / motivo)
  const [moverModal, setMoverModal] = useState<{
    cardId: string;
    colunaAtualId: string;
    licitacaoId: string;
    destinoInicial: string;
  } | null>(null);

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

  // Extrai UFs e modalidades distintas para os filtros
  const { ufsDisponiveis, modalidadesDisponiveis } = useMemo(() => {
    const lic = Array.isArray(licitacoes) ? licitacoes : [];
    const ufSet = new Set<string>();
    const modSet = new Set<string>();
    for (const l of lic) {
      if (l.uf) ufSet.add(l.uf);
      if (l.modalidade) modSet.add(l.modalidade);
    }
    return {
      ufsDisponiveis: [...ufSet].sort(),
      modalidadesDisponiveis: [...modSet].sort(),
    };
  }, [licitacoes]);

  const colunasComCards = useMemo(() => {
    const cols = Array.isArray(colunas) ? colunas : [];
    const lic = Array.isArray(licitacoes) ? licitacoes : [];
    const buscaLower = filtros.busca.toLowerCase();

    return cols.map((col: { id: string; nome: string; cor: string; tipo?: string; corEtapa?: string | null }) => ({
      ...col,
      cards: (lic as unknown as LicitacaoListaItem[])
        .filter((l) => l.card?.colunaId === col.id)
        .filter((l) => {
          // Busca por texto
          if (filtros.busca &&
            !l.titulo.toLowerCase().includes(buscaLower) &&
            !l.orgao?.toLowerCase().includes(buscaLower) &&
            !l.objeto?.toLowerCase().includes(buscaLower)
          ) return false;

          // Filtro UF
          if (filtros.uf && l.uf !== filtros.uf) return false;

          // Filtro modalidade
          if (filtros.modalidade && l.modalidade !== filtros.modalidade) return false;

          // Filtro urgente
          if (filtros.urgente === "sim" && !l.card?.urgente) return false;
          if (filtros.urgente === "nao" && l.card?.urgente) return false;

          return true;
        })
        .map((l) => {
          // Calculate checklist progress for this column
          const checklistItens = getChecklistItensColuna(col.nome, l.card?.checklistPorColuna);
          const checklistProgresso = l.card?.checklistProgresso ?? null;

          let progresso: { feitos: number; total: number } | null = null;
          if (checklistItens.length > 0) {
            const progressoColuna = (checklistProgresso as Record<string, Record<string, boolean>> | null)?.[col.nome] ?? {};
            const feitos = Object.values(progressoColuna).filter(Boolean).length;
            progresso = { feitos, total: checklistItens.length };
          }

          return {
            id: l.card!.id,
            licitacao: {
              id: l.id,
              numero: l.numero,
              titulo: l.titulo,
              orgao: l.orgao,
              uf: l.uf,
              valorEstimado: l.valorEstimado,
              dataSessao: l.dataSessao,
              dataPublicacao: l.dataPublicacao,
              modalidade: l.modalidade,
              scorePreliminar: l.scorePreliminar ?? null,
              classificacaoPreliminar: l.classificacaoPreliminar ?? null,
              fonte: l.fonte ? { tipo: l.fonte.tipo, nome: l.fonte.nome } : null,
              score: l.score ?? null,
            },
            urgente: l.card!.urgente,
            responsavel: l.card!.responsavel,
            checklistProgresso,
            coluna: {
              nome: col.nome,
              corEtapa: col.corEtapa ?? null,
              cor: col.cor,
            },
            progresso,
          };
        }),
    })) as unknown as ColunaData[];
  }, [colunas, licitacoes, filtros]);

  /** Atualização otimista: move o card localmente no cache */
  const moverOtimista = useCallback(
    (cardId: string, colunaDestinoId: string) => {
      queryClient.setQueryData(["licitacoes"], (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as LicitacaoListaItem[]).map((l) => {
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

    const nomeLC = colDestino.nome.toLowerCase();
    const ehResultado = nomeLC.includes("ganh") || nomeLC.includes("perd");

    if (colDestino.tipo === "final_negativo" || ehResultado) {
      // Encontra a licitacaoId do card
      const card = colunaOrigem?.cards.find((c) => c.id === cardId);
      const licitacaoId = card?.licitacao?.id;
      if (!licitacaoId) return;

      setMoverModal({
        cardId,
        colunaAtualId: colunaOrigem!.id,
        licitacaoId,
        destinoInicial: colDestino.id,
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

  function handleMoverModalConfirm(colunaDestinoId: string, motivo?: string) {
    if (!moverModal) return;
    moverOtimista(moverModal.cardId, colunaDestinoId);
    moverMutation.mutate({
      cardId: moverModal.cardId,
      colunaDestinoId,
      motivo,
    });
    setMoverModal(null);
  }

  function handleMoverModalClose() {
    setMoverModal(null);
  }

  function handleCardClick(licitacaoId: string) {
    if (isDraggingRef.current) return;
    setDrawerLicitacaoId(licitacaoId);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <FilterBar
          filtros={filtros}
          onChange={setFiltros}
          ufs={ufsDisponiveis}
          modalidades={modalidadesDisponiveis}
        />
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

      {/* Modal de mover card (com resultado / motivo) */}
      {moverModal && (
        <MoverCardModal
          colunas={colunas as KanbanColuna[]}
          colunaAtualId={moverModal.colunaAtualId}
          licitacaoId={moverModal.licitacaoId}
          destinoInicial={moverModal.destinoInicial}
          onMover={handleMoverModalConfirm}
          onClose={handleMoverModalClose}
        />
      )}

      {drawerLicitacaoId && (
        <LicitacaoDrawer
          licitacaoId={drawerLicitacaoId}
          onClose={() => setDrawerLicitacaoId(null)}
        />
      )}
    </div>
  );
}
