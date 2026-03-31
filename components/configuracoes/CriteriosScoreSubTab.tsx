"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { CriterioScore, TipoCriterio, ConfiguracaoScore } from "@/types/parametros";

export function CriteriosScoreSubTab() {
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formTipo, setFormTipo] = useState<TipoCriterio>("objetivo");
  const [formPeso, setFormPeso] = useState("");
  const [formFormulaRef, setFormFormulaRef] = useState("");
  const [formFaixaMin, setFormFaixaMin] = useState("0");
  const [formFaixaMax, setFormFaixaMax] = useState("100");

  const { data: criterios = [], isLoading, isError } = useQuery<CriterioScore[]>({
    queryKey: ["criterios-score"],
    queryFn: async () => {
      const r = await fetch("/api/criterios-score");
      if (!r.ok) throw new Error("Erro ao carregar critérios");
      return r.json();
    },
  });

  const { data: empresa } = useQuery<{ configuracaoScore: ConfiguracaoScore | null }>({
    queryKey: ["empresa"],
    queryFn: async () => {
      const r = await fetch("/api/empresa");
      if (!r.ok) throw new Error("Erro ao carregar empresa");
      return r.json();
    },
  });

  const configScore = empresa?.configuracaoScore;
  const somaPesos = criterios.reduce((acc, c) => acc + c.peso, 0);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["criterios-score"] });
  }

  function limparForm() {
    setFormNome("");
    setFormDescricao("");
    setFormTipo("objetivo");
    setFormPeso("");
    setFormFormulaRef("");
    setFormFaixaMin("0");
    setFormFaixaMax("100");
    setEditandoId(null);
    setMostrarForm(false);
  }

  function preencherForm(c: CriterioScore) {
    setFormNome(c.nome);
    setFormDescricao(c.descricao);
    setFormTipo(c.tipo);
    setFormPeso(String(c.peso));
    setFormFormulaRef(c.formulaRef ?? "");
    setFormFaixaMin(String(c.faixaMin ?? 0));
    setFormFaixaMax(String(c.faixaMax ?? 100));
    setEditandoId(c.id);
    setMostrarForm(true);
  }

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const dados = {
        nome: formNome,
        descricao: formDescricao,
        tipo: formTipo,
        peso: Number(formPeso),
        formulaRef: formFormulaRef || null,
        faixaMin: Number(formFaixaMin),
        faixaMax: Number(formFaixaMax),
        ordem: editandoId ? undefined : criterios.length,
      };

      const url = editandoId ? `/api/criterios-score/${editandoId}` : "/api/criterios-score";
      const method = editandoId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao salvar");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      limparForm();
      toast.success(editandoId ? "Critério atualizado" : "Critério adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/criterios-score/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Critério removido");
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
        <p className="text-sm text-red-600">Erro ao carregar critérios.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              somaPesos === 100 ? "bg-green-500" : somaPesos > 100 ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(somaPesos, 100)}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          somaPesos === 100 ? "text-green-600" : somaPesos > 100 ? "text-red-600" : "text-amber-600"
        }`}>
          {somaPesos}/100
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {criterios.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.nome}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  c.tipo === "objetivo" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                }`}>
                  {c.tipo}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{c.descricao}</p>
            </div>
            <span className="text-sm font-semibold text-slate-700 w-12 text-right">
              {c.peso}%
            </span>
            <button
              onClick={() => preencherForm(c)}
              className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Remover "${c.nome}"?`)) excluirMutation.mutate(c.id);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {criterios.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum critério cadastrado. Adicione o primeiro abaixo.
          </p>
        )}
      </div>

      {!mostrarForm && (
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar critério
        </Button>
      )}

      {mostrarForm && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {editandoId ? "Editar critério" : "Novo critério"}
            </h4>
            <button onClick={limparForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input placeholder="Nome (ex: aderencia_portfolio)" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Textarea placeholder="Descrição do critério" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formTipo} onChange={(e) => setFormTipo(e.target.value as TipoCriterio)}>
                <option value="objetivo">Objetivo</option>
                <option value="subjetivo">Subjetivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Peso (%)</label>
              <Input type="number" placeholder="25" value={formPeso} onChange={(e) => setFormPeso(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fórmula (ref)</label>
              <Input placeholder="match_palavras_chave" value={formFormulaRef} onChange={(e) => setFormFormulaRef(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Min</label>
                <Input type="number" value={formFaixaMin} onChange={(e) => setFormFaixaMin(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Max</label>
                <Input type="number" value={formFaixaMax} onChange={(e) => setFormFaixaMax(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={limparForm}>Cancelar</Button>
            <Button
              size="sm"
              onClick={() => salvarMutation.mutate()}
              disabled={!formNome || !formDescricao || !formPeso || salvarMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> {editandoId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {configScore && (
        <div className="mt-6 rounded-lg border bg-slate-50 p-4">
          <h4 className="text-sm font-medium mb-3">Faixas de classificação</h4>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {(["A", "B", "C", "D"] as const).map((faixa) => (
              <div key={faixa} className={`rounded-lg p-2 text-center ${
                faixa === "A" ? "bg-green-100 text-green-700" :
                faixa === "B" ? "bg-blue-100 text-blue-700" :
                faixa === "C" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                <div className="font-bold">{faixa}</div>
                <div className="text-xs">{configScore.faixas[faixa][0]}-{configScore.faixas[faixa][1]}</div>
                <div className="text-xs mt-0.5">{configScore.recomendacoes[faixa]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
