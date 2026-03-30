"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { KanbanColuna } from "@/types/licitacao";

const TIPO_LABELS: Record<string, string> = {
  inicial: "Inicial (entrada)",
  normal: "Normal",
  final_positivo: "Final (ganhou)",
  final_negativo: "Final (perdeu/descartou)",
};

export function ColunasEditor() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [novoTipo, setNovoTipo] = useState("normal");

  const { data: colunas = [] } = useQuery<KanbanColuna[]>({
    queryKey: ["colunas-todas"],
    queryFn: async () => {
      const r = await fetch("/api/colunas");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar colunas");
      return data;
    },
  });

  const listaColunas = Array.isArray(colunas) ? colunas : [];

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["colunas-todas"] });
    queryClient.invalidateQueries({ queryKey: ["colunas"] });
  }

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
      invalidar();
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
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/colunas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      invalidar();
      toast.success("Coluna removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function mover(coluna: KanbanColuna, direcao: "up" | "down") {
    const idx = listaColunas.findIndex((c) => c.id === coluna.id);
    const vizinhoIdx = direcao === "up" ? idx - 1 : idx + 1;
    if (vizinhoIdx < 0 || vizinhoIdx >= listaColunas.length) return;

    const vizinho = listaColunas[vizinhoIdx];
    // Troca as ordens entre as duas colunas
    editarMutation.mutate({ id: coluna.id, ordem: vizinho.ordem });
    editarMutation.mutate({ id: vizinho.id, ordem: coluna.ordem });
  }

  function confirmarExcluir(col: KanbanColuna) {
    if (!window.confirm(`Tem certeza que deseja remover a coluna "${col.nome}"? Cards nela precisarão ser movidos antes.`)) return;
    excluirMutation.mutate(col.id);
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-4">
        Organize as colunas do seu Kanban. Use as setas para reordenar.
        Colunas &quot;Inicial&quot; recebem novas licitações automaticamente.
        Colunas &quot;Final (perdeu)&quot; pedem motivo ao mover um card para lá.
      </p>

      <div className="space-y-2 mb-6">
        {listaColunas.map((col, idx) => (
          <div key={col.id} className="flex items-center gap-2 rounded-lg border bg-white p-3">
            {/* Setas de reordenação */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => mover(col, "up")}
                disabled={idx === 0}
                className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                title="Mover para cima"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => mover(col, "down")}
                disabled={idx === listaColunas.length - 1}
                className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                title="Mover para baixo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Cor */}
            <input
              type="color"
              className="h-7 w-7 cursor-pointer rounded border-none"
              defaultValue={col.cor}
              onChange={(e) => editarMutation.mutate({ id: col.id, cor: e.target.value })}
              title="Cor da coluna"
            />

            {/* Nome editável */}
            <input
              className="flex-1 text-sm font-medium border-none bg-transparent outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
              defaultValue={col.nome}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== col.nome) {
                  editarMutation.mutate({ id: col.id, nome: e.target.value });
                }
              }}
            />

            {/* Tipo */}
            <select
              className="rounded border px-2 py-1 text-xs text-slate-600"
              defaultValue={col.tipo}
              onChange={(e) => editarMutation.mutate({ id: col.id, tipo: e.target.value })}
            >
              <option value="inicial">Inicial</option>
              <option value="normal">Normal</option>
              <option value="final_positivo">Final +</option>
              <option value="final_negativo">Final −</option>
            </select>

            {/* Excluir */}
            <button
              onClick={() => confirmarExcluir(col)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Excluir coluna"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {listaColunas.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma coluna configurada. Adicione a primeira abaixo.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="text-sm font-medium mb-3">Adicionar nova coluna</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Nome da coluna (ex: Análise, Proposta...)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoNome) criarMutation.mutate();
              }}
            />
          </div>
          <input
            type="color"
            className="h-9 w-9 cursor-pointer rounded"
            value={novaCor}
            onChange={(e) => setNovaCor(e.target.value)}
            title="Cor"
          />
          <select
            className="rounded border px-2 py-2 text-sm"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
          >
            <option value="inicial">Inicial</option>
            <option value="normal">Normal</option>
            <option value="final_positivo">Final +</option>
            <option value="final_negativo">Final −</option>
          </select>
          <Button
            size="sm"
            onClick={() => criarMutation.mutate()}
            disabled={!novoNome || criarMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
