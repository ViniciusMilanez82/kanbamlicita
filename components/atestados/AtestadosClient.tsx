"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Award, Plus, Search, Pencil, Trash2, Calendar, DollarSign, Tag, FileCheck, X } from "lucide-react";
import { toast } from "sonner";

interface Atestado {
  id: string; clienteNome: string; clienteCnpj: string | null;
  descricaoServico: string; tags: string[]; valorContrato: number | null;
  dataInicio: string | null; dataFim: string | null;
  possuiCat: boolean; numeroCat: string | null; observacoes: string | null;
  documentoId: string | null; documento?: { nome: string; status: string } | null;
}
interface DocOption { id: string; nome: string }
type AtestadoForm = {
  documentoId: string; clienteNome: string; clienteCnpj: string;
  descricaoServico: string; tags: string[]; valorContrato: string;
  dataInicio: string; dataFim: string; possuiCat: boolean;
  numeroCat: string; observacoes: string;
};

const TAGS_PREDEFINIDAS = [
  "offshore","industrial","eventos","construção civil","logística",
  "modular","refrigerado","habitacional","energia","mineração",
];
const TAG_CORES: Record<string, string> = {
  offshore: "bg-blue-100 text-blue-800", industrial: "bg-amber-100 text-amber-800",
  eventos: "bg-purple-100 text-purple-800", "construção civil": "bg-orange-100 text-orange-800",
  "logística": "bg-green-100 text-green-800", modular: "bg-cyan-100 text-cyan-800",
  refrigerado: "bg-teal-100 text-teal-800", habitacional: "bg-rose-100 text-rose-800",
  energia: "bg-yellow-100 text-yellow-800", "mineração": "bg-stone-100 text-stone-800",
};
const FORM_VAZIO: AtestadoForm = {
  documentoId: "", clienteNome: "", clienteCnpj: "", descricaoServico: "",
  tags: [], valorContrato: "", dataInicio: "", dataFim: "",
  possuiCat: false, numeroCat: "", observacoes: "",
};

function formatBRL(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}
function maskCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

export function AtestadosClient() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroTag, setFiltroTag] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<AtestadoForm>(FORM_VAZIO);
  const [tagCustom, setTagCustom] = useState("");

  const { data: atestados = [], isLoading } = useQuery<Atestado[]>({
    queryKey: ["atestados"],
    queryFn: async () => {
      const r = await fetch("/api/atestados"); const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar atestados");
      return data;
    },
  });
  const { data: docsOpcoes = [] } = useQuery<DocOption[]>({
    queryKey: ["docs-tecnica"],
    queryFn: async () => {
      const r = await fetch("/api/documentos-empresa?categoria=tecnica");
      const data = await r.json();
      return !r.ok ? [] : Array.isArray(data) ? data : data.documentos ?? [];
    },
  });

  const todasTags = useMemo(() => {
    const s = new Set<string>();
    atestados.forEach((a) => a.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [atestados]);

  const lista = useMemo(() => {
    let res = atestados;
    if (busca.trim()) {
      const t = busca.toLowerCase();
      res = res.filter((a) => a.clienteNome.toLowerCase().includes(t) || a.descricaoServico.toLowerCase().includes(t));
    }
    if (filtroTag && filtroTag !== "__all__") res = res.filter((a) => a.tags?.includes(filtroTag));
    const min = valorMin ? parseFloat(valorMin) : null;
    const max = valorMax ? parseFloat(valorMax) : null;
    if (min != null) res = res.filter((a) => (a.valorContrato ?? 0) >= min);
    if (max != null) res = res.filter((a) => (a.valorContrato ?? 0) <= max);
    return res;
  }, [atestados, busca, filtroTag, valorMin, valorMax]);

  const salvarMut = useMutation({
    mutationFn: async (d: AtestadoForm & { id?: string }) => {
      const url = d.id ? `/api/atestados/${d.id}` : "/api/atestados";
      const r = await fetch(url, {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentoId: d.documentoId || null, clienteNome: d.clienteNome,
          clienteCnpj: d.clienteCnpj.replace(/\D/g, "") || null,
          descricaoServico: d.descricaoServico, tags: d.tags,
          valorContrato: d.valorContrato ? parseFloat(d.valorContrato) : null,
          dataInicio: d.dataInicio || null, dataFim: d.dataFim || null,
          possuiCat: d.possuiCat, numeroCat: d.possuiCat ? d.numeroCat || null : null,
          observacoes: d.observacoes || null,
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erro ao salvar"); }
      return r.json();
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["atestados"] }); toast.success(v.id ? "Atestado atualizado!" : "Atestado cadastrado!"); fecharDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluirMut = useMutation({
    mutationFn: async (id: string) => { const r = await fetch(`/api/atestados/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Erro ao excluir"); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["atestados"] }); toast.success("Atestado excluído!"); },
    onError: () => toast.error("Não foi possível excluir. Tente novamente."),
  });

  function abrirNovo() { setEditandoId(null); setForm(FORM_VAZIO); setDialogAberto(true); }
  function abrirEdicao(a: Atestado) {
    setEditandoId(a.id);
    setForm({
      documentoId: a.documentoId ?? "", clienteNome: a.clienteNome,
      clienteCnpj: a.clienteCnpj ? maskCnpj(a.clienteCnpj) : "",
      descricaoServico: a.descricaoServico, tags: a.tags ?? [],
      valorContrato: a.valorContrato != null ? String(a.valorContrato) : "",
      dataInicio: a.dataInicio ? a.dataInicio.slice(0, 10) : "",
      dataFim: a.dataFim ? a.dataFim.slice(0, 10) : "",
      possuiCat: a.possuiCat, numeroCat: a.numeroCat ?? "", observacoes: a.observacoes ?? "",
    });
    setDialogAberto(true);
  }
  function fecharDialog() { setDialogAberto(false); setEditandoId(null); setForm(FORM_VAZIO); setTagCustom(""); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteNome.trim()) { toast.error("Preencha o nome do cliente."); return; }
    if (!form.descricaoServico.trim()) { toast.error("Preencha a descrição do serviço."); return; }
    salvarMut.mutate({ ...form, id: editandoId ?? undefined });
  }
  function toggleTag(tag: string) {
    setForm((p) => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag] }));
  }
  function addCustomTag() {
    const t = tagCustom.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }));
    setTagCustom("");
  }

  return (
    <div className="max-w-5xl">
      <p className="text-sm text-slate-500 mb-1">Banco de atestados de capacidade técnica da empresa</p>
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button size="sm" onClick={abrirNovo} className="gap-1.5"><Plus className="h-4 w-4" /> Novo atestado</Button>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar cliente ou serviço..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
        {todasTags.length > 0 && (
          <Select value={filtroTag} onValueChange={(v) => setFiltroTag(v ?? "")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar por tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as tags</SelectItem>
              {todasTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-slate-400" />
          <Input placeholder="Mín" value={valorMin} onChange={(e) => setValorMin(e.target.value.replace(/[^\d.]/g, ""))} className="w-24" />
          <span className="text-slate-400">—</span>
          <Input placeholder="Máx" value={valorMax} onChange={(e) => setValorMax(e.target.value.replace(/[^\d.]/g, ""))} className="w-24" />
        </div>
      </div>
      {/* Lista */}
      {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
          <Award className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          {busca || filtroTag || valorMin || valorMax
            ? "Nenhum atestado encontrado para esses filtros."
            : "Nenhum atestado cadastrado. Cadastre atestados de capacidade técnica para facilitar a montagem de propostas."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.map((a) => (
            <div key={a.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-medium text-slate-900">{a.clienteNome}</h3>
                  {a.clienteCnpj && <p className="text-xs text-slate-500 tabular-nums">{maskCnpj(a.clienteCnpj)}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon-xs" onClick={() => abrirEdicao(a)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => excluirMut.mutate(a.id)} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </div>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">{a.descricaoServico}</p>
              {a.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {a.tags.map((t) => (
                    <span key={t} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_CORES[t] ?? "bg-slate-100 text-slate-700"}`}>{t}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {a.valorContrato != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatBRL(a.valorContrato)}</span>}
                {(a.dataInicio || a.dataFim) && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(a.dataInicio)} — {formatDate(a.dataFim)}</span>}
                {a.possuiCat && <Badge variant="secondary" className="text-[10px]">CAT</Badge>}
              </div>
              {a.documento && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <FileCheck className="h-3 w-3" /><span>{a.documento.nome}</span>
                  <Badge variant="outline" className="text-[10px]">{a.documento.status}</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Dialog */}
      <Dialog open={dialogAberto} onOpenChange={(open) => !open && fecharDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar atestado" : "Novo atestado"}</DialogTitle>
            <DialogDescription>{editandoId ? "Atualize as informações do atestado técnico." : "Cadastre um novo atestado de capacidade técnica."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {docsOpcoes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Documento de origem</label>
                <Select value={form.documentoId} onValueChange={(v) => setForm({ ...form, documentoId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione um documento" /></SelectTrigger>
                  <SelectContent>{docsOpcoes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cliente <span className="text-red-500">*</span></label>
              <Input value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CNPJ do cliente</label>
              <Input value={form.clienteCnpj} onChange={(e) => setForm({ ...form, clienteCnpj: maskCnpj(e.target.value) })} placeholder="00.000.000/0000-00" maxLength={18} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição do serviço <span className="text-red-500">*</span></label>
              <Textarea value={form.descricaoServico} onChange={(e) => setForm({ ...form, descricaoServico: e.target.value })} placeholder="Descreva o serviço prestado..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAGS_PREDEFINIDAS.map((tag) => {
                  const sel = form.tags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${sel ? `${TAG_CORES[tag] ?? "bg-slate-200 text-slate-800"} border-transparent` : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {tag}{sel && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-1">
                <Input value={tagCustom} onChange={(e) => setTagCustom(e.target.value)} placeholder="Tag personalizada" className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} />
                <Button type="button" variant="outline" size="sm" onClick={addCustomTag}><Tag className="h-3.5 w-3.5" /></Button>
              </div>
              {form.tags.filter((t) => !TAGS_PREDEFINIDAS.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tags.filter((t) => !TAGS_PREDEFINIDAS.includes(t)).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {t}<button type="button" onClick={() => toggleTag(t)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valor do contrato</label>
                <Input value={form.valorContrato} onChange={(e) => setForm({ ...form, valorContrato: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data início</label>
                <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data fim</label>
                <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.possuiCat} onChange={(e) => setForm({ ...form, possuiCat: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                Possui CAT (Certidão de Acervo Técnico)
              </label>
              {form.possuiCat && <Input value={form.numeroCat} onChange={(e) => setForm({ ...form, numeroCat: e.target.value })} placeholder="Número da CAT" className="mt-1" />}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações adicionais..." rows={2} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={salvarMut.isPending}>{salvarMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
