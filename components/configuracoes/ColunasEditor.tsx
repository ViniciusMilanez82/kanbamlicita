"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { KanbanColuna } from "@/types/licitacao";

export function ColunasEditor() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [novoTipo, setNovoTipo] = useState("normal");

  const { data: colunas = [] } = useQuery<KanbanColuna[]>({
    queryKey: ["colunas-todas"],
    queryFn: () => fetch("/api/colunas").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      fetch("/api/colunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, cor: novaCor, tipo: novoTipo }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colunas-todas"] });
      queryClient.invalidateQueries({ queryKey: ["colunas"] });
      setNovoNome("");
      toast.success("Coluna criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editarMutation = useMutation({
    mutationFn: (data: Partial<KanbanColuna> & { id: string }) =>
      fetch("/api/colunas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colunas-todas"] });
      queryClient.invalidateQueries({ queryKey: ["colunas"] });
      toast.success("Coluna atualizada!");
    },
  });

  const tipoLabels: Record<string, string> = {
    inicial: "Inicial (entrada)",
    normal: "Normal",
    final_positivo: "Final (positivo)",
    final_negativo: "Final (negativo)",
  };

  return (
    <div className="max-w-lg">
      <p className="text-sm text-slate-500 mb-4">
        Configure as colunas do seu Kanban. Colunas &quot;Inicial&quot; recebem novas licitações.
        Colunas &quot;Final negativo&quot; pedem motivo ao mover.
      </p>

      <div className="space-y-2 mb-6">
        {colunas.map((col) => (
          <div key={col.id} className="flex items-center gap-3 rounded border bg-white p-3">
            <GripVertical className="h-4 w-4 text-slate-300" />
            <div className="h-4 w-4 rounded" style={{ backgroundColor: col.cor }} />
            <input
              className="flex-1 text-sm font-medium border-none bg-transparent outline-none"
              defaultValue={col.nome}
              onBlur={(e) => {
                if (e.target.value !== col.nome) editarMutation.mutate({ id: col.id, nome: e.target.value });
              }}
            />
            <span className="text-xs text-slate-400">{tipoLabels[col.tipo] ?? col.tipo}</span>
            <input
              type="color"
              className="h-6 w-6 cursor-pointer border-none"
              defaultValue={col.cor}
              onChange={(e) => editarMutation.mutate({ id: col.id, cor: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="text-sm font-medium mb-3">Adicionar Coluna</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input placeholder="Nome da coluna" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          </div>
          <input type="color" className="h-9 w-9 cursor-pointer" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} />
          <select className="rounded border px-2 py-2 text-sm" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
            <option value="inicial">Inicial</option>
            <option value="normal">Normal</option>
            <option value="final_positivo">Final +</option>
            <option value="final_negativo">Final -</option>
          </select>
          <Button size="sm" onClick={() => criarMutation.mutate()} disabled={!novoNome}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
