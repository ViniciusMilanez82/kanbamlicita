"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X, Check } from "lucide-react";

type Coluna = {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: string;
};

export function AbaColunasKanban() {
  const [carregando, setCarregando] = useState(true);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicaoNome, setEdicaoNome] = useState("");
  const [edicaoCor, setEdicaoCor] = useState("#3B82F6");

  async function recarregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/colunas");
      if (!r.ok) throw new Error("Falha ao carregar");
      const j = (await r.json()) as Coluna[];
      setColunas(j);
    } catch {
      toast.error("Não conseguimos carregar as colunas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function adicionar() {
    if (!novoNome.trim()) return;
    setCriando(true);
    try {
      const r = await fetch("/api/colunas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim(), cor: novaCor }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Falha ao criar.");
      }
      setNovoNome("");
      setNovaCor("#3B82F6");
      toast.success("Coluna criada.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.");
    } finally {
      setCriando(false);
    }
  }

  function iniciarEdicao(c: Coluna) {
    setEditandoId(c.id);
    setEdicaoNome(c.nome);
    setEdicaoCor(c.cor);
  }

  async function salvarEdicao(c: Coluna) {
    if (!edicaoNome.trim()) return;
    try {
      const r = await fetch("/api/colunas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, nome: edicaoNome.trim(), cor: edicaoCor }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Falha ao salvar.");
      }
      setEditandoId(null);
      toast.success("Coluna atualizada.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  async function trocarOrdem(c: Coluna, direcao: -1 | 1) {
    const idx = colunas.findIndex((x) => x.id === c.id);
    const alvoIdx = idx + direcao;
    if (alvoIdx < 0 || alvoIdx >= colunas.length) return;
    const alvo = colunas[alvoIdx];
    try {
      await Promise.all([
        fetch("/api/colunas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, ordem: alvo.ordem }),
        }),
        fetch("/api/colunas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: alvo.id, ordem: c.ordem }),
        }),
      ]);
      await recarregar();
    } catch {
      toast.error("Falha ao reordenar.");
    }
  }

  async function excluir(c: Coluna) {
    if (!confirm(`Excluir a coluna "${c.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const r = await fetch("/api/colunas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Falha ao excluir.");
      }
      toast.success("Coluna excluída.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Colunas do Kanban
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Adicione, renomeie, mude a cor ou remova as colunas que aparecem no
          quadro de licitações.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium text-slate-700">Nova coluna</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex.: Em análise, Proposta enviada…"
            className="flex-1 min-w-[200px]"
          />
          <input
            type="color"
            value={novaCor}
            onChange={(e) => setNovaCor(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-slate-200"
            aria-label="Cor"
          />
          <Button onClick={adicionar} disabled={criando || !novoNome.trim()}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {carregando ? (
          <div className="p-4 text-sm text-slate-500">Carregando colunas…</div>
        ) : colunas.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            Nenhuma coluna cadastrada ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {colunas.map((c, idx) => {
              const editando = editandoId === c.id;
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded"
                    style={{ background: editando ? edicaoCor : c.cor }}
                  />
                  {editando ? (
                    <>
                      <Input
                        value={edicaoNome}
                        onChange={(e) => setEdicaoNome(e.target.value)}
                        className="flex-1"
                      />
                      <input
                        type="color"
                        value={edicaoCor}
                        onChange={(e) => setEdicaoCor(e.target.value)}
                        className="h-8 w-12 cursor-pointer rounded border border-slate-200"
                        aria-label="Cor"
                      />
                      <Button
                        size="sm"
                        onClick={() => salvarEdicao(c)}
                        disabled={!edicaoNome.trim()}
                      >
                        <Check className="h-4 w-4" />
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditandoId(null)}
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm font-medium text-slate-800">
                        {c.nome}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => trocarOrdem(c, -1)}
                        disabled={idx === 0}
                        aria-label="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => trocarOrdem(c, 1)}
                        disabled={idx === colunas.length - 1}
                        aria-label="Mover para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicao(c)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => excluir(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Para excluir uma coluna, primeiro mova ou exclua os cards que estão
        nela. Apenas administradores podem alterar colunas.
      </p>
    </div>
  );
}
