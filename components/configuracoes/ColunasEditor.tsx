"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowUp, ArrowDown, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { KanbanColuna } from "@/types/licitacao";

const ACOES_DISPONIVEIS = [
  { value: "triagem_ia", label: "Triagem IA" },
  { value: "analise_profunda", label: "Análise Profunda" },
  { value: "checar_habilitacao", label: "Checar Habilitação" },
  { value: "sugerir_proposta", label: "Sugerir Proposta" },
  { value: "analise_juridica", label: "Análise Jurídica" },
  { value: "redigir_impugnacao", label: "Redigir Impugnação" },
  { value: "resumo_executivo", label: "Resumo Executivo" },
];

const PAPEIS_DISPONIVEIS = [
  { value: "", label: "Nenhum" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnico", label: "Técnico" },
  { value: "juridico", label: "Jurídico" },
  { value: "diretor", label: "Diretor" },
  { value: "administrativo", label: "Administrativo" },
];

export function ColunasEditor() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [novoTipo, setNovoTipo] = useState("normal");
  const [novaCorEtapa, setNovaCorEtapa] = useState("");
  const [novoPapel, setNovoPapel] = useState("");
  const [novasAcoes, setNovasAcoes] = useState<string[]>([]);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());

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

  function toggleExpandido(id: string) {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAcao(colId: string, currentAcoes: string[], acao: string) {
    const novas = currentAcoes.includes(acao)
      ? currentAcoes.filter((a) => a !== acao)
      : [...currentAcoes, acao];
    editarMutation.mutate({ id: colId, acoesPadrao: novas });
  }

  function toggleNovaAcao(acao: string) {
    setNovasAcoes((prev) =>
      prev.includes(acao) ? prev.filter((a) => a !== acao) : [...prev, acao]
    );
  }

  const criarMutation = useMutation({
    mutationFn: () =>
      fetch("/api/colunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome,
          cor: novaCor,
          tipo: novoTipo,
          corEtapa: novaCorEtapa || null,
          papelResponsavel: novoPapel || null,
          acoesPadrao: novasAcoes,
        }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      invalidar();
      setNovoNome("");
      setNovaCorEtapa("");
      setNovoPapel("");
      setNovasAcoes([]);
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
        Clique no ícone de engrenagem para configurar o workflow de cada etapa.
      </p>

      <div className="space-y-2 mb-6">
        {listaColunas.map((col, idx) => (
          <div key={col.id} className="rounded-lg border bg-white overflow-hidden">
            {/* Linha principal */}
            <div className="flex items-center gap-2 p-3">
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

              {/* Config workflow */}
              <button
                onClick={() => toggleExpandido(col.id)}
                className={`rounded p-1.5 transition-colors ${
                  expandido.has(col.id)
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
                title="Configurar workflow"
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {/* Excluir */}
              <button
                onClick={() => confirmarExcluir(col)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Excluir coluna"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Painel de workflow expandível */}
            {expandido.has(col.id) && (
              <div className="border-t bg-slate-50 px-4 py-3 space-y-3">
                <div className="flex items-center gap-4">
                  {/* Cor da etapa */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Cor etapa:</label>
                    <input
                      type="color"
                      className="h-6 w-6 cursor-pointer rounded border"
                      value={col.corEtapa ?? col.cor}
                      onChange={(e) => editarMutation.mutate({ id: col.id, corEtapa: e.target.value })}
                      title="Cor da etapa (borda do card/drawer)"
                    />
                  </div>

                  {/* Papel responsável */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Responsável:</label>
                    <select
                      className="rounded border px-2 py-1 text-xs text-slate-600"
                      value={col.papelResponsavel ?? ""}
                      onChange={(e) =>
                        editarMutation.mutate({
                          id: col.id,
                          papelResponsavel: e.target.value || null,
                        })
                      }
                    >
                      {PAPEIS_DISPONIVEIS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ações da etapa */}
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Ações desta etapa:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACOES_DISPONIVEIS.map((acao) => {
                      const ativa = (col.acoesPadrao ?? []).includes(acao.value);
                      return (
                        <label
                          key={acao.value}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                            ativa
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={ativa}
                            onChange={() => toggleAcao(col.id, col.acoesPadrao ?? [], acao.value)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          {acao.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
        <div className="space-y-3">
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
          </div>

          {/* Workflow config para nova coluna */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Cor etapa:</label>
              <input
                type="color"
                className="h-6 w-6 cursor-pointer rounded border"
                value={novaCorEtapa || novaCor}
                onChange={(e) => setNovaCorEtapa(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Responsável:</label>
              <select
                className="rounded border px-2 py-1 text-xs text-slate-600"
                value={novoPapel}
                onChange={(e) => setNovoPapel(e.target.value)}
              >
                {PAPEIS_DISPONIVEIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Ações:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ACOES_DISPONIVEIS.map((acao) => {
                const ativa = novasAcoes.includes(acao.value);
                return (
                  <label
                    key={acao.value}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                      ativa
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={() => toggleNovaAcao(acao.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    {acao.label}
                  </label>
                );
              })}
            </div>
          </div>

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
