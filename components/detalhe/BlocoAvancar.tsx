"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BlocoAvancarProps {
  cardId: string;
  licitacaoId: string;
  colunaAtualId: string;
  colunas: { id: string; nome: string; cor: string; tipo: string; ordem: number }[];
}

export function BlocoAvancar({ cardId, licitacaoId, colunaAtualId, colunas }: BlocoAvancarProps) {
  const queryClient = useQueryClient();
  const [motivoMover, setMotivoMover] = useState("");
  const [colunaPendente, setColunaPendente] = useState<{ id: string; nome: string; tipo: string } | null>(null);

  const colunaAtual = colunas.find((c) => c.id === colunaAtualId);
  const ordemAtual = colunaAtual?.ordem ?? 0;
  const proxima = colunas.filter((c) => c.ordem > ordemAtual).sort((a, b) => a.ordem - b.ordem)[0];
  const anterior = colunas.filter((c) => c.ordem < ordemAtual).sort((a, b) => b.ordem - a.ordem)[0];
  const colunaDescartar = colunas.find((c) => c.tipo === "final_negativo");

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
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Card movido!");
      setColunaPendente(null);
      setMotivoMover("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAvancar() {
    if (!proxima) return;
    if (proxima.tipo === "final_negativo") { setColunaPendente(proxima); } else { moverMutation.mutate({ cardId, colunaDestinoId: proxima.id }); }
  }
  function handleVoltar() { if (anterior) moverMutation.mutate({ cardId, colunaDestinoId: anterior.id }); }
  function handleDescartar() { if (colunaDescartar) setColunaPendente(colunaDescartar); }
  function confirmarMover() {
    if (!colunaPendente || !motivoMover.trim()) return;
    moverMutation.mutate({ cardId, colunaDestinoId: colunaPendente.id, motivo: motivoMover.trim() });
  }

  return (
    <div className="space-y-2">
      {colunaPendente && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">Por que está movendo para &quot;{colunaPendente.nome}&quot;?</p>
          <Textarea placeholder="Ex: Não atende requisitos técnicos, prazo inviável..." value={motivoMover} onChange={(e) => setMotivoMover(e.target.value)} rows={2} autoFocus />
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmarMover} disabled={!motivoMover.trim() || moverMutation.isPending}>Confirmar</Button>
            <Button size="sm" variant="outline" onClick={() => { setColunaPendente(null); setMotivoMover(""); }}>Cancelar</Button>
          </div>
        </div>
      )}
      {!colunaPendente && (
        <div className="flex gap-2">
          {proxima && (
            <Button size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAvancar} disabled={moverMutation.isPending}>
              <ArrowRight className="h-3.5 w-3.5" /> Avançar → {proxima.nome}
            </Button>
          )}
          {anterior && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleVoltar} disabled={moverMutation.isPending}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          )}
          {colunaDescartar && colunaDescartar.id !== colunaAtualId && (
            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDescartar} disabled={moverMutation.isPending}>
              <X className="h-3.5 w-3.5" /> Descartar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
