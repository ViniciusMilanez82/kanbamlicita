"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Ban, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface Concorrente {
  id: string;
  nome: string;
  cnpj: string | null;
  segmentos: string[];
  porte: string | null;
  uf: string | null;
  observacoes: string | null;
  ativo: boolean;
  _count?: { licitacoes: number };
}

type ConcorrenteForm = {
  nome: string;
  cnpj: string;
  segmentos: string[];
  porte: string;
  uf: string;
  observacoes: string;
};

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const SEGMENTOS = [
  "offshore",
  "industrial",
  "eventos",
  "construção civil",
  "logística",
  "modular",
];

const PORTES = [
  { value: "micro", label: "Micro" },
  { value: "pequena", label: "Pequena" },
  { value: "media", label: "Média" },
  { value: "grande", label: "Grande" },
];

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const SEGMENTO_CORES: Record<string, string> = {
  offshore: "bg-blue-100 text-blue-800",
  industrial: "bg-amber-100 text-amber-800",
  eventos: "bg-purple-100 text-purple-800",
  "construção civil": "bg-orange-100 text-orange-800",
  "logística": "bg-green-100 text-green-800",
  modular: "bg-cyan-100 text-cyan-800",
};

const FORM_VAZIO: ConcorrenteForm = {
  nome: "",
  cnpj: "",
  segmentos: [],
  porte: "",
  uf: "",
  observacoes: "",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "—";
  return maskCnpj(cnpj);
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export function ConcorrentesClient() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ConcorrenteForm>(FORM_VAZIO);

  /* --- Dados -------------------------------------------------------- */

  const { data: concorrentes = [], isLoading } = useQuery<Concorrente[]>({
    queryKey: ["concorrentes"],
    queryFn: async () => {
      const r = await fetch("/api/concorrentes");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar concorrentes");
      return data;
    },
  });

  const lista = useMemo(() => {
    if (!busca.trim()) return concorrentes;
    const termo = busca.toLowerCase();
    return concorrentes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.cnpj && c.cnpj.includes(termo.replace(/\D/g, "")))
    );
  }, [concorrentes, busca]);

  /* --- Mutations ----------------------------------------------------- */

  const salvarMutation = useMutation({
    mutationFn: async (dados: ConcorrenteForm & { id?: string }) => {
      const url = dados.id ? `/api/concorrentes/${dados.id}` : "/api/concorrentes";
      const method = dados.id ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: dados.nome,
          cnpj: dados.cnpj.replace(/\D/g, "") || null,
          segmentos: dados.segmentos,
          porte: dados.porte || null,
          uf: dados.uf || null,
          observacoes: dados.observacoes || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao salvar");
      }
      return r.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["concorrentes"] });
      toast.success(vars.id ? "Concorrente atualizado!" : "Concorrente cadastrado!");
      fecharDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const r = await fetch(`/api/concorrentes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      });
      if (!r.ok) throw new Error("Erro ao atualizar situação");
      return r.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["concorrentes"] });
      toast.success(vars.ativo ? "Concorrente reativado!" : "Concorrente desativado!");
    },
    onError: () => {
      toast.error("Não foi possível atualizar. Tente novamente.");
    },
  });

  /* --- Handlers ------------------------------------------------------ */

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  }

  function abrirEdicao(c: Concorrente) {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      cnpj: c.cnpj ? maskCnpj(c.cnpj) : "",
      segmentos: c.segmentos ?? [],
      porte: c.porte ?? "",
      uf: c.uf ?? "",
      observacoes: c.observacoes ?? "",
    });
    setDialogAberto(true);
  }

  function fecharDialog() {
    setDialogAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Preencha o nome do concorrente.");
      return;
    }
    salvarMutation.mutate({ ...form, id: editandoId ?? undefined });
  }

  function toggleSegmento(seg: string) {
    setForm((prev) => ({
      ...prev,
      segmentos: prev.segmentos.includes(seg)
        ? prev.segmentos.filter((s) => s !== seg)
        : [...prev.segmentos, seg],
    }));
  }

  /* --- Render -------------------------------------------------------- */

  return (
    <div className="max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-1">
        <p className="text-sm text-slate-500">
          Empresas que participam das mesmas licitações
        </p>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button size="sm" onClick={abrirNovo} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo concorrente
        </Button>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista / Tabela */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
          {busca
            ? "Nenhum concorrente encontrado para essa busca."
            : "Nenhum concorrente cadastrado ainda. Clique em \"Novo concorrente\" para começar."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">CNPJ</th>
                <th className="px-4 py-2">Segmentos</th>
                <th className="px-4 py-2">Porte</th>
                <th className="px-4 py-2">UF</th>
                <th className="px-4 py-2 text-center">Licitações</th>
                <th className="px-4 py-2">Situação</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-2.5 font-medium">{c.nome}</td>
                  <td className="px-4 py-2.5 text-slate-600 tabular-nums">
                    {formatCnpj(c.cnpj)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(c.segmentos ?? []).map((seg) => (
                        <span
                          key={seg}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            SEGMENTO_CORES[seg] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {seg}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-slate-600">
                    {c.porte
                      ? PORTES.find((p) => p.value === c.porte)?.label ?? c.porte
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{c.uf ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    {c._count?.licitacoes ?? 0}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={c.ativo ? "secondary" : "destructive"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => abrirEdicao(c)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          toggleAtivoMutation.mutate({
                            id: c.id,
                            ativo: !c.ativo,
                          })
                        }
                        title={c.ativo ? "Desativar" : "Reativar"}
                      >
                        {c.ativo ? (
                          <Ban className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de criação / edição */}
      <Dialog open={dialogAberto} onOpenChange={(open) => !open && fecharDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar concorrente" : "Novo concorrente"}
            </DialogTitle>
            <DialogDescription>
              {editandoId
                ? "Atualize as informações da empresa concorrente."
                : "Cadastre uma nova empresa que participa das mesmas licitações."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={form.cnpj}
                onChange={(e) =>
                  setForm({ ...form, cnpj: maskCnpj(e.target.value) })
                }
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            {/* Segmentos */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Segmentos</label>
              <div className="flex flex-wrap gap-1.5">
                {SEGMENTOS.map((seg) => {
                  const selecionado = form.segmentos.includes(seg);
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => toggleSegmento(seg)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selecionado
                          ? `${SEGMENTO_CORES[seg] ?? "bg-slate-200 text-slate-800"} border-transparent`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {seg}
                      {selecionado && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Porte e UF lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Porte</label>
                <Select
                  value={form.porte}
                  onValueChange={(val) => setForm({ ...form, porte: val as string })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">UF</label>
                <Select
                  value={form.uf}
                  onValueChange={(val) => setForm({ ...form, uf: val as string })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
                placeholder="Informações adicionais sobre este concorrente..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
              >
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
