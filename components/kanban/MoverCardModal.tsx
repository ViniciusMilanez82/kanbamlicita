"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KanbanColuna } from "@/types/licitacao";

interface MoverCardModalProps {
  colunas: KanbanColuna[];
  colunaAtualId: string;
  onMover: (colunaDestinoId: string, motivo?: string) => void;
  onClose: () => void;
}

export function MoverCardModal({ colunas, colunaAtualId, onMover, onClose }: MoverCardModalProps) {
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState("");

  const colDestino = colunas.find((c) => c.id === destino);
  const precisaMotivo = colDestino?.tipo === "final_negativo";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Mover Card</h3>

        <select
          className="w-full rounded border px-3 py-2 mb-3"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Selecione a coluna destino</option>
          {colunas
            .filter((c) => c.id !== colunaAtualId && c.ativo)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
        </select>

        {precisaMotivo && (
          <Input
            placeholder="Motivo (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mb-3"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onMover(destino, motivo || undefined)}
            disabled={!destino || (precisaMotivo && !motivo)}
          >
            Mover
          </Button>
        </div>
      </div>
    </div>
  );
}
