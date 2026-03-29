"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2 } from "lucide-react";
import { ProdutoForm } from "./ProdutoForm";
import { ImportarCatalogoModal } from "./ImportarCatalogoModal";
import { toast } from "sonner";

export function ProdutosList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => fetch("/api/produtos").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: (data: { nome: string; descricao: string; categoria: string; palavrasChave: string[] }) =>
      fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado!");
      setShowForm(false);
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/produtos?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido!");
    },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowImportar(true)} className="gap-1.5">
          <Upload className="h-4 w-4" /> Importar com IA
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProdutoForm onSave={(data) => criarMutation.mutate(data)} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {produtos.map((p: { id: string; nome: string; descricao: string | null; categoria: string | null; palavrasChave: string[]; ativo: boolean }) => (
          <div key={p.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
            <div>
              <h3 className="font-medium">{p.nome}</h3>
              {p.descricao && <p className="text-sm text-slate-500 mt-0.5">{p.descricao}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {p.categoria && <Badge variant="outline">{p.categoria}</Badge>}
                {p.palavrasChave.map((kw: string) => (
                  <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                ))}
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Remover este produto?")) deletarMutation.mutate(p.id); }}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {produtos.length === 0 && !showForm && (
          <p className="text-center text-slate-400 py-8">
            Nenhum produto cadastrado. Adicione seus produtos ou importe com IA.
          </p>
        )}
      </div>

      {showImportar && <ImportarCatalogoModal onClose={() => setShowImportar(false)} />}
    </div>
  );
}
