"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  Link,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
  Shield,
  FileCheck,
} from "lucide-react";
import type { ChecklistEditalItem, DecisaoGoNoGo } from "@/types/licitacao";

const CATEGORIAS = [
  { value: "juridica", label: "Jurídica", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "fiscal", label: "Fiscal", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "trabalhista", label: "Trabalhista", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "tecnica", label: "Técnica", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "economica", label: "Econômica", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "complementar", label: "Complementar", color: "bg-slate-100 text-slate-800 border-slate-200" },
] as const;

const STATUS_ITEMS = [
  { value: "pendente", label: "Pendente" },
  { value: "atendido", label: "Atendido" },
  { value: "parcial", label: "Parcial" },
  { value: "nao_atendido", label: "Não atendido" },
] as const;

function catLabel(cat: string) {
  return CATEGORIAS.find((c) => c.value === cat)?.label ?? cat;
}
function catColor(cat: string) {
  return CATEGORIAS.find((c) => c.value === cat)?.color ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function statusIcon(status: string) {
  switch (status) {
    case "atendido":
      return <CheckCircle2 className="size-4 text-green-500" />;
    case "parcial":
      return <AlertCircle className="size-4 text-yellow-500" />;
    case "nao_atendido":
      return <XCircle className="size-4 text-red-500" />;
    default:
      return <Circle className="size-4 text-slate-300" />;
  }
}

export function HabilitacaoTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ nome: "", categoria: "juridica", obrigatorio: true });

  const { data: items = [], isLoading } = useQuery<ChecklistEditalItem[]>({
    queryKey: ["checklist", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist`);
      if (!r.ok) throw new Error("Erro ao carregar documentos");
      return r.json();
    },
  });

  const { data: decisao } = useQuery<DecisaoGoNoGo | null>({
    queryKey: ["go-nogo", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/go-nogo`);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("Erro ao carregar decisão");
      return r.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["checklist", licitacaoId] });
  };

  const gerarIaMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist/gerar-ia`, { method: "POST" });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => { toast.success("Documentos gerados pela IA!"); invalidate(); },
    onError: () => toast.error("Não foi possível gerar os documentos. Tente novamente."),
  });

  const vincularMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist/vincular`, { method: "POST" });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => { toast.success("Documentos vinculados!"); invalidate(); },
    onError: () => toast.error("Não foi possível vincular. Tente novamente."),
  });

  const addItemMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Item adicionado!");
      invalidate();
      setNewItem({ nome: "", categoria: "juridica", obrigatorio: true });
      setShowAddForm(false);
    },
    onError: () => toast.error("Erro ao adicionar item. Tente novamente."),
  });

  const updateItemMut = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao atualizar. Tente novamente."),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (itemId: string) => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/checklist/${itemId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { toast.success("Item removido."); invalidate(); },
    onError: () => toast.error("Erro ao remover. Tente novamente."),
  });

  const grouped = useMemo(() => {
    const map: Record<string, ChecklistEditalItem[]> = {};
    for (const cat of CATEGORIAS) map[cat.value] = [];
    for (const item of items) {
      if (!map[item.categoria]) map[item.categoria] = [];
      map[item.categoria].push(item);
    }
    return Object.entries(map).filter(([, list]) => list.length > 0);
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const atendidos = items.filter((i) => i.status === "atendido").length;
    const pct = total > 0 ? Math.round((atendidos / total) * 100) : 0;
    const status = total === 0 ? "Pendente" : atendidos === total ? "Pronto" : atendidos > 0 ? "Parcial" : "Pendente";
    return { total, atendidos, pct, status };
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => gerarIaMut.mutate()}
          disabled={gerarIaMut.isPending}
        >
          <Sparkles className="size-4 mr-1" />
          {gerarIaMut.isPending ? "Gerando..." : "Gerar com IA"}
        </Button>
        <Button
          variant="outline"
          onClick={() => vincularMut.mutate()}
          disabled={vincularMut.isPending}
        >
          <Link className="size-4 mr-1" />
          {vincularMut.isPending ? "Vinculando..." : "Vincular documentos"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="size-4 mr-1" />
          Adicionar item
        </Button>
      </div>

      {showAddForm && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4 bg-slate-50">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Nome do documento</label>
            <Input
              value={newItem.nome}
              onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
              placeholder="Ex: Certidão de regularidade fiscal"
            />
          </div>
          <div className="w-[180px]">
            <label className="text-sm font-medium">Categoria</label>
            <Select
              value={newItem.categoria}
              onValueChange={(v) => setNewItem({ ...newItem, categoria: v ?? "juridica" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm pb-1">
            <input
              type="checkbox"
              checked={newItem.obrigatorio}
              onChange={(e) => setNewItem({ ...newItem, obrigatorio: e.target.checked })}
              className="rounded"
            />
            Obrigatório
          </label>
          <Button
            onClick={() => addItemMut.mutate()}
            disabled={addItemMut.isPending || !newItem.nome.trim()}
          >
            {addItemMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileCheck className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            Nenhum documento necessário cadastrado
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Use &quot;Gerar com IA&quot; para criar automaticamente a lista de documentos
            necessários para esta licitação.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, catItems]) => (
            <div key={cat} className="rounded-lg border overflow-hidden">
              <div className={`px-4 py-2 font-medium text-sm border-b ${catColor(cat)}`}>
                {catLabel(cat)} ({catItems.length})
              </div>
              <div className="divide-y">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    {statusIcon(item.status)}
                    <span className="flex-1 text-sm">{item.nome}</span>
                    {item.obrigatorio && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">Obrigatório</Badge>
                    )}
                    {item.documentoEmpresa && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Shield className="size-3" />
                        {item.documentoEmpresa.nome}
                        {item.documentoEmpresa.dataValidade && (
                          <span className="text-slate-400">
                            — validade: {new Date(item.documentoEmpresa.dataValidade).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {item.documentoEmpresa.nivelAlerta === "critico" && (
                          <Badge variant="destructive" className="text-[10px] px-1">Vencido</Badge>
                        )}
                        {item.documentoEmpresa.nivelAlerta === "alerta" && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[10px] px-1">A vencer</Badge>
                        )}
                      </span>
                    )}
                    <Select
                      value={item.status}
                      onValueChange={(v) => v && updateItemMut.mutate({ itemId: item.id, status: v })}
                    >
                      <SelectTrigger className="w-[140px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ITEMS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteItemMut.mutate(item.id)}
                      disabled={deleteItemMut.isPending}
                    >
                      <Trash2 className="size-3.5 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border p-4 bg-slate-50">
          <span className="text-sm font-medium text-slate-700">
            {stats.atendidos} de {stats.total} atendidos ({stats.pct}%)
          </span>
          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <Badge
            className={
              stats.status === "Pronto"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : stats.status === "Parcial"
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-100"
            }
          >
            {stats.status}
          </Badge>
        </div>
      )}

      <GoNoGoPanel licitacaoId={licitacaoId} decisao={decisao ?? null} />
    </div>
  );
}

function GoNoGoPanel({
  licitacaoId,
  decisao,
}: {
  licitacaoId: string;
  decisao: DecisaoGoNoGo | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!decisao);
  const [form, setForm] = useState({
    decisao: decisao?.decisao ?? "",
    justificativa: decisao?.justificativa ?? "",
    riscos: decisao?.riscosIdentificados?.join("\n") ?? "",
  });

  const salvarMut = useMutation({
    mutationFn: async () => {
      const riscosArr = form.riscos
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const r = await fetch(`/api/licitacoes/${licitacaoId}/go-nogo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisao: form.decisao,
          justificativa: form.justificativa || null,
          riscosIdentificados: riscosArr.length > 0 ? riscosArr : null,
        }),
      });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Decisão registrada!");
      queryClient.invalidateQueries({ queryKey: ["go-nogo", licitacaoId] });
      setEditing(false);
    },
    onError: () => toast.error("Erro ao salvar decisão. Tente novamente."),
  });

  const DEC: Record<string, { color: string; label: string; badge: string }> = {
    go: { color: "border-green-300 bg-green-50", label: "Go", badge: "bg-green-100 text-green-800 hover:bg-green-100" },
    no_go: { color: "border-red-300 bg-red-50", label: "No-Go", badge: "bg-red-100 text-red-800 hover:bg-red-100" },
    condicional: { color: "border-yellow-300 bg-yellow-50", label: "Condicional", badge: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  };
  const dec = (d: string) => DEC[d] ?? { color: "border-slate-200", label: "", badge: "" };

  return (
    <div className={`rounded-lg border p-5 space-y-4 ${dec(decisao?.decisao ?? form.decisao).color}`}>
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="size-5" />
        Decisão Go/No-Go
      </h3>

      {decisao && !editing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className={dec(decisao.decisao).badge}>{dec(decisao.decisao).label}</Badge>
            {decisao.decididoPor?.name && (
              <span className="text-sm text-slate-500">
                por {decisao.decididoPor.name} em{" "}
                {new Date(decisao.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          {decisao.justificativa && (
            <p className="text-sm text-slate-700">{decisao.justificativa}</p>
          )}
          {decisao.riscosIdentificados && decisao.riscosIdentificados.length > 0 && (
            <div>
              <span className="text-sm font-medium">Riscos identificados:</span>
              <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                {decisao.riscosIdentificados.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Alterar decisão
          </Button>
        </div>
      )}

      {(editing || !decisao) && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { value: "go", label: "Go", cls: "border-green-400 bg-green-50 hover:bg-green-100 text-green-800" },
              { value: "no_go", label: "No-Go", cls: "border-red-400 bg-red-50 hover:bg-red-100 text-red-800" },
              { value: "condicional", label: "Condicional", cls: "border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-800" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className={`${form.decisao === opt.value ? opt.cls + " ring-2 ring-offset-1" : ""}`}
                onClick={() => setForm({ ...form, decisao: opt.value })}
              >
                {opt.value === "go" && <CheckCircle2 className="size-4 mr-1" />}
                {opt.value === "no_go" && <XCircle className="size-4 mr-1" />}
                {opt.value === "condicional" && <AlertCircle className="size-4 mr-1" />}
                {opt.label}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium">Justificativa</label>
            <Textarea
              value={form.justificativa}
              onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
              rows={3}
              placeholder="Explique o motivo da decisão..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Riscos identificados (um por linha)</label>
            <Textarea
              value={form.riscos}
              onChange={(e) => setForm({ ...form, riscos: e.target.value })}
              rows={3}
              placeholder={"Ex: Prazo curto para reunir documentos\nCertidão fiscal vencendo em 10 dias"}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => salvarMut.mutate()}
              disabled={salvarMut.isPending || !form.decisao}
            >
              {salvarMut.isPending ? "Salvando..." : "Salvar decisão"}
            </Button>
            {decisao && (
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
