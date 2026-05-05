"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { KanbanColuna } from "@/types/licitacao";

interface MoverCardModalProps {
  colunas: KanbanColuna[];
  colunaAtualId: string;
  destinoInicial?: string;
  onMover: (colunaDestinoId: string, motivo?: string) => void;
  onClose: () => void;
}

export function MoverCardModal({
  colunas,
  colunaAtualId,
  destinoInicial,
  onMover,
  onClose,
}: MoverCardModalProps) {
  const [destino, setDestino] = useState(destinoInicial ?? "");
  const [motivo, setMotivo] = useState("");

  const colDestino = colunas.find((c) => c.id === destino);
  const precisaMotivo = colDestino?.tipo === "final_negativo";
  const desabilitar = !destino || (precisaMotivo && !motivo.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Mover card</h3>

        <select
          className="w-full rounded border px-3 py-2 mb-3"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Selecione a coluna destino</option>
          {colunas
            .filter((c) => c.id !== colunaAtualId && c.ativo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>

        <Textarea
          placeholder={
            precisaMotivo ? "Motivo (obrigatório)" : "Observações (opcional)"
          }
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="mb-3"
          rows={3}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onMover(destino, motivo.trim() || undefined)}
            disabled={desabilitar}
          >
            Mover
          </Button>
        </div>
      </div>
    </div>
  );
}
