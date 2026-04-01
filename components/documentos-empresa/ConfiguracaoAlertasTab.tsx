"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";

type ConfigAlerta = {
  id: string;
  tipoDocumento: string;
  diasVerde: number;
  diasAmarelo: number;
  diasLaranja: number;
  diasVermelho: number;
  diasPreto: number;
};

export function ConfiguracaoAlertasTab() {
  const queryClient = useQueryClient();
  const [novoTipo, setNovoTipo] = useState("");
  const [editando, setEditando] = useState<Record<string, Partial<ConfigAlerta>>>({});

  const { data: configs = [], isLoading } = useQuery<ConfigAlerta[]>({
    queryKey: ["config-alertas-doc"],
    queryFn: async () => {
      const r = await fetch("/api/documentos-empresa/configuracao-alertas");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async (data: { id: string; body: Partial<ConfigAlerta> }) => {
      const r = await fetch(
        `/api/documentos-empresa/configuracao-alertas/${data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.body),
        }
      );
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-alertas-doc"] });
      setEditando({});
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (tipoDocumento: string) => {
      const r = await fetch("/api/documentos-empresa/configuracao-alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoDocumento }),
      });
      if (!r.ok) throw new Error("Erro ao criar");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-alertas-doc"] });
      setNovoTipo("");
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(
        `/api/documentos-empresa/configuracao-alertas/${id}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error("Erro ao excluir");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-alertas-doc"] });
    },
  });

  function handleFieldChange(
    id: string,
    field: string,
    value: string
  ) {
    setEditando((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseInt(value) || 0 },
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Configure os dias de antecedência para cada nível de alerta por tipo de
        documento. Documentos sem configuração usam os valores padrão (90/60/30/15/0).
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Tipo de documento</th>
              <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-700">
                Verde (dias)
              </th>
              <th className="px-4 py-3 text-center bg-yellow-50 text-yellow-700">
                Amarelo
              </th>
              <th className="px-4 py-3 text-center bg-orange-50 text-orange-700">
                Laranja
              </th>
              <th className="px-4 py-3 text-center bg-red-50 text-red-700">
                Vermelho
              </th>
              <th className="px-4 py-3 text-center bg-slate-200 text-slate-700">
                Preto
              </th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => {
              const edicao = editando[config.id];
              const temEdicao = edicao && Object.keys(edicao).length > 0;

              return (
                <tr key={config.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {config.tipoDocumento}
                  </td>
                  {(
                    [
                      "diasVerde",
                      "diasAmarelo",
                      "diasLaranja",
                      "diasVermelho",
                      "diasPreto",
                    ] as const
                  ).map((field) => (
                    <td key={field} className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={edicao?.[field] ?? config[field]}
                        onChange={(e) =>
                          handleFieldChange(config.id, field, e.target.value)
                        }
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {temEdicao && (
                        <button
                          onClick={() =>
                            salvarMutation.mutate({
                              id: config.id,
                              body: edicao,
                            })
                          }
                          className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                          title="Salvar"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Excluir esta configuração?"))
                            excluirMutation.mutate(config.id);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adicionar novo tipo */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
          placeholder="Novo tipo de documento..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <Button
          variant="outline"
          onClick={() => novoTipo && criarMutation.mutate(novoTipo)}
          disabled={!novoTipo || criarMutation.isPending}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
