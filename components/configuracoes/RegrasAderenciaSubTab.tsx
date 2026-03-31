"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { RegraAderencia, TipoRegra, OperadorRegra } from "@/types/parametros";
import { TIPO_REGRA_LABELS, OPERADOR_LABELS } from "@/types/parametros";

const CAMPOS_LICITACAO = [
  { value: "modalidade", label: "Modalidade" },
  { value: "uf", label: "UF" },
  { value: "objeto", label: "Objeto" },
  { value: "orgao", label: "Órgão" },
  { value: "valorEstimado", label: "Valor estimado" },
  { value: "municipio", label: "Município" },
];

function previewRegra(r: { tipo: TipoRegra; campo: string; operador: OperadorRegra; valor: string; peso: number | null }) {
  const campoLabel = CAMPOS_LICITACAO.find((c) => c.value === r.campo)?.label ?? r.campo;
  const operadorLabel = OPERADOR_LABELS[r.operador];
  const tipoLabel = TIPO_REGRA_LABELS[r.tipo].toLowerCase();
  const pesoStr = r.peso ? ` (peso ${r.peso > 0 ? "+" : ""}${r.peso})` : "";
  return `Se ${campoLabel} ${operadorLabel} "${r.valor}" → ${tipoLabel}${pesoStr}`;
}

export function RegrasAderenciaSubTab() {
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState<TipoRegra>("inclusao");
  const [formCampo, setFormCampo] = useState("modalidade");
  const [formOperador, setFormOperador] = useState<OperadorRegra>("contem");
  const [formValor, setFormValor] = useState("");
  const [formPeso, setFormPeso] = useState("");
  const [formDescricao, setFormDescricao] = useState("");

  const { data: regras = [], isLoading, isError } = useQuery<RegraAderencia[]>({
    queryKey: ["regras-aderencia"],
    queryFn: async () => {
      const r = await fetch("/api/regras-aderencia");
      if (!r.ok) throw new Error("Erro ao carregar regras");
      return r.json();
    },
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["regras-aderencia"] });
  }

  function limparForm() {
    setFormNome("");
    setFormTipo("inclusao");
    setFormCampo("modalidade");
    setFormOperador("contem");
    setFormValor("");
    setFormPeso("");
    setFormDescricao("");
    setEditandoId(null);
    setMostrarForm(false);
  }

  function preencherForm(r: RegraAderencia) {
    setFormNome(r.nome);
    setFormTipo(r.tipo);
    setFormCampo(r.campo);
    setFormOperador(r.operador);
    setFormValor(r.valor);
    setFormPeso(r.peso != null ? String(r.peso) : "");
    setFormDescricao(r.descricao ?? "");
    setEditandoId(r.id);
    setMostrarForm(true);
  }

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const dados = {
        nome: formNome,
        tipo: formTipo,
        campo: formCampo,
        operador: formOperador,
        valor: formValor,
        peso: formPeso ? Number(formPeso) : null,
        descricao: formDescricao || null,
      };

      const url = editandoId ? `/api/regras-aderencia/${editandoId}` : "/api/regras-aderencia";
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
      toast.success(editandoId ? "Regra atualizada" : "Regra adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/regras-aderencia/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Regra removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Erro ao carregar regras.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => invalidar()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-2 mb-6">
        {regras.map((r) => (
          <div key={r.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                r.tipo === "inclusao" ? "bg-green-100 text-green-700" :
                r.tipo === "exclusao" ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {TIPO_REGRA_LABELS[r.tipo]}
              </span>
              <span className="flex-1 text-sm font-medium">{r.nome}</span>
              <button
                onClick={() => preencherForm(r)}
                className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Remover "${r.nome}"?`)) excluirMutation.mutate(r.id);
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-14">
              {previewRegra(r)}
            </p>
            {r.descricao && (
              <p className="text-xs text-slate-400 mt-0.5 ml-14 italic">{r.descricao}</p>
            )}
          </div>
        ))}

        {regras.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma regra cadastrada. Adicione a primeira abaixo.
          </p>
        )}
      </div>

      {!mostrarForm && (
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar regra
        </Button>
      )}

      {mostrarForm && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {editandoId ? "Editar regra" : "Nova regra"}
            </h4>
            <button onClick={limparForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input placeholder="Nome da regra" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formTipo} onChange={(e) => setFormTipo(e.target.value as TipoRegra)}>
                <option value="inclusao">Inclusão</option>
                <option value="exclusao">Exclusão</option>
                <option value="condicional">Condicional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Campo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formCampo} onChange={(e) => setFormCampo(e.target.value)}>
                {CAMPOS_LICITACAO.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Operador</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={formOperador} onChange={(e) => setFormOperador(e.target.value as OperadorRegra)}>
                {Object.entries(OPERADOR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Valor</label>
              <Input placeholder="Pregão Eletrônico" value={formValor} onChange={(e) => setFormValor(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Peso</label>
              <Input type="number" placeholder="20" value={formPeso} onChange={(e) => setFormPeso(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Descrição</label>
              <Input placeholder="Justificativa da regra" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} />
            </div>
          </div>

          {formCampo && formOperador && formValor && (
            <div className="mt-3 rounded bg-white border p-2 text-xs text-slate-600">
              {previewRegra({
                tipo: formTipo,
                campo: formCampo,
                operador: formOperador,
                valor: formValor,
                peso: formPeso ? Number(formPeso) : null,
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={limparForm}>Cancelar</Button>
            <Button
              size="sm"
              onClick={() => salvarMutation.mutate()}
              disabled={!formNome || !formValor || salvarMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> {editandoId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
