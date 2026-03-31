"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ParametroEstrategico, CategoriaParametro } from "@/types/parametros";
import { CATEGORIA_LABELS } from "@/types/parametros";

const CATEGORIAS = Object.keys(CATEGORIA_LABELS) as CategoriaParametro[];

export function ParametrosGeraisSubTab() {
  const queryClient = useQueryClient();
  const [categoria, setCategoria] = useState<CategoriaParametro>("segmento");
  const [novoValor, setNovoValor] = useState("");
  const [novoPeso, setNovoPeso] = useState("");

  const { data: parametros = [], isLoading, isError } = useQuery<ParametroEstrategico[]>({
    queryKey: ["parametros", categoria],
    queryFn: async () => {
      const r = await fetch(`/api/parametros?categoria=${categoria}`);
      if (!r.ok) throw new Error("Erro ao carregar parâmetros");
      return r.json();
    },
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["parametros", categoria] });
  }

  const criarMutation = useMutation({
    mutationFn: async () => {
      const chave = novoValor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const r = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          chave,
          valor: novoValor,
          peso: novoPeso ? Number(novoPeso) : null,
          ordem: parametros.length,
        }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao criar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      setNovoValor("");
      setNovoPeso("");
      toast.success("Parâmetro adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, ...dados }: Partial<ParametroEstrategico> & { id: string }) => {
      const r = await fetch(`/api/parametros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao editar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Parâmetro atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/parametros/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Parâmetro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Erro ao carregar parâmetros.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaParametro)}
        >
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIA_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 mb-6">
        {parametros.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-white p-3">
            <input
              className="flex-1 text-sm font-medium border-none bg-transparent outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
              defaultValue={p.valor}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== p.valor) {
                  editarMutation.mutate({ id: p.id, valor: e.target.value });
                }
              }}
            />
            <input
              className="w-20 text-sm text-center border rounded px-2 py-1"
              type="number"
              defaultValue={p.peso ?? ""}
              placeholder="Peso"
              onBlur={(e) => {
                const novoPesoVal = e.target.value ? Number(e.target.value) : null;
                if (novoPesoVal !== p.peso) {
                  editarMutation.mutate({ id: p.id, peso: novoPesoVal });
                }
              }}
            />
            <button
              onClick={() => {
                if (window.confirm(`Remover "${p.valor}"?`)) {
                  excluirMutation.mutate(p.id);
                }
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {parametros.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum parâmetro nesta categoria. Adicione o primeiro abaixo.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="text-sm font-medium mb-3">Adicionar parâmetro</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Valor (ex: Contêineres Marítimos)"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoValor) criarMutation.mutate();
              }}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              placeholder="Peso"
              value={novoPeso}
              onChange={(e) => setNovoPeso(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => criarMutation.mutate()}
            disabled={!novoValor || criarMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
