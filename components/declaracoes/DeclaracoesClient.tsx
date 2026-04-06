"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSignature, Plus, Pencil, Trash2, FileText, Printer, Play } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string; nome: string; categoria: string;
  descricao: string | null; conteudo: string; variaveis: string[];
}
type TemplateForm = { nome: string; categoria: string; descricao: string; conteudo: string };

const CATEGORIAS = [
  { value: "idoneidade", label: "Idoneidade" },
  { value: "visita_tecnica", label: "Visita técnica" },
  { value: "ME_EPP", label: "ME/EPP" },
  { value: "inexistencia_fato", label: "Inexistência de fato" },
  { value: "compromisso", label: "Compromisso" },
  { value: "outro", label: "Outro" },
];
const VARIAVEIS_SUGERIDAS = [
  "EMPRESA_NOME","EMPRESA_CNPJ","EMPRESA_ENDERECO","REPRESENTANTE_NOME",
  "REPRESENTANTE_CPF","REPRESENTANTE_CARGO","LICITACAO_NUMERO",
  "LICITACAO_ORGAO","DATA_ATUAL","CIDADE",
];
const FORM_VAZIO: TemplateForm = { nome: "", categoria: "", descricao: "", conteudo: "" };

function extrairVariaveis(conteudo: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  let m; while ((m = regex.exec(conteudo)) !== null) vars.add(m[1]);
  return Array.from(vars);
}
function categLabel(cat: string) { return CATEGORIAS.find((c) => c.value === cat)?.label ?? cat; }

export function DeclaracoesClient() {
  const qc = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(FORM_VAZIO);
  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [valoresVars, setValoresVars] = useState<Record<string, string>>({});
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates-declaracao"],
    queryFn: async () => {
      const r = await fetch("/api/templates-declaracao"); const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar modelos");
      return data;
    },
  });
  const templateAtual = useMemo(() => templates.find((t) => t.id === templateSelecionado), [templates, templateSelecionado]);
  const variaveisTemplate = useMemo(() => templateAtual?.variaveis ?? [], [templateAtual]);

  const salvarMut = useMutation({
    mutationFn: async (d: TemplateForm & { id?: string }) => {
      const vars = extrairVariaveis(d.conteudo);
      const url = d.id ? `/api/templates-declaracao/${d.id}` : "/api/templates-declaracao";
      const r = await fetch(url, {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: d.nome, categoria: d.categoria, descricao: d.descricao || null, conteudo: d.conteudo, variaveis: vars }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erro ao salvar"); }
      return r.json();
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["templates-declaracao"] }); toast.success(v.id ? "Modelo atualizado!" : "Modelo cadastrado!"); fecharDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluirMut = useMutation({
    mutationFn: async (id: string) => { const r = await fetch(`/api/templates-declaracao/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Erro ao excluir"); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates-declaracao"] }); toast.success("Modelo excluído!"); },
    onError: () => toast.error("Não foi possível excluir. Tente novamente."),
  });
  const gerarMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/templates-declaracao/${templateSelecionado}/gerar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variaveis: valoresVars }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erro ao gerar declaração"); }
      return r.json();
    },
    onSuccess: (data) => { setHtmlPreview(data.html ?? data.conteudo ?? ""); toast.success("Declaração gerada!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNovo() { setEditandoId(null); setForm(FORM_VAZIO); setDialogAberto(true); }
  function abrirEdicao(t: Template) {
    setEditandoId(t.id);
    setForm({ nome: t.nome, categoria: t.categoria, descricao: t.descricao ?? "", conteudo: t.conteudo });
    setDialogAberto(true);
  }
  function fecharDialog() { setDialogAberto(false); setEditandoId(null); setForm(FORM_VAZIO); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Preencha o nome do modelo."); return; }
    if (!form.categoria) { toast.error("Selecione uma categoria."); return; }
    if (!form.conteudo.trim()) { toast.error("Preencha o conteúdo do modelo."); return; }
    salvarMut.mutate({ ...form, id: editandoId ?? undefined });
  }
  function selecionarTemplate(id: string) { setTemplateSelecionado(id); setValoresVars({}); setHtmlPreview(null); }
  function imprimirPreview() {
    if (!htmlPreview) return;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Não foi possível abrir a janela de impressão."); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Declaração</title><style>body{font-family:serif;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>${htmlPreview}</body></html>`);
    win.document.close();
    win.print();
  }
  const varsConteudo = useMemo(() => extrairVariaveis(form.conteudo), [form.conteudo]);

  return (
    <div className="max-w-6xl">
      <p className="text-sm text-slate-500 mb-4">Crie modelos de declarações e gere documentos preenchidos automaticamente</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna esquerda: Templates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Modelos</h2>
            <Button size="sm" onClick={abrirNovo} className="gap-1.5"><Plus className="h-4 w-4" /> Novo modelo</Button>
          </div>
          {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
              <FileSignature className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              Nenhum modelo cadastrado. Crie um modelo para gerar declarações automaticamente.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} onClick={() => selecionarTemplate(t.id)}
                  className={`rounded-lg border p-3 transition-colors cursor-pointer ${templateSelecionado === t.id ? "border-blue-300 bg-blue-50" : "bg-white hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">{t.nome}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1">{categLabel(t.categoria)}</Badge>
                      {t.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.descricao}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); selecionarTemplate(t.id); }} title="Usar para gerar"><Play className="h-3.5 w-3.5 text-green-600" /></Button>
                      <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); abrirEdicao(t); }} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); excluirMut.mutate(t.id); }} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Coluna direita: Gerador */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Gerar declaração</h2>
          {!templateSelecionado || !templateAtual ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              Selecione um modelo ao lado para gerar uma declaração
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <h3 className="text-sm font-medium mb-1">{templateAtual.nome}</h3>
                <Badge variant="outline" className="text-[10px]">{categLabel(templateAtual.categoria)}</Badge>
                {variaveisTemplate.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-slate-500">Preencha os campos abaixo para gerar a declaração:</p>
                    {variaveisTemplate.map((v) => (
                      <div key={v} className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">{v.replace(/_/g, " ")}</label>
                        <Input value={valoresVars[v] ?? ""} onChange={(e) => setValoresVars((p) => ({ ...p, [v]: e.target.value }))} placeholder={v} />
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-500 mt-3">Este modelo não possui variáveis. A declaração será gerada com o conteúdo fixo.</p>}
                <Button className="mt-4 gap-1.5 w-full" onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending}>
                  <Play className="h-4 w-4" />{gerarMut.isPending ? "Gerando..." : "Gerar declaração"}
                </Button>
              </div>
              {htmlPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">Resultado</h3>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={imprimirPreview}><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
                  </div>
                  <div className="rounded-lg border bg-white p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Dialog criar/editar template */}
      <Dialog open={dialogAberto} onOpenChange={(open) => !open && fecharDialog()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar modelo" : "Novo modelo"}</DialogTitle>
            <DialogDescription>{editandoId ? "Atualize o modelo de declaração." : "Crie um modelo de declaração. Use {{NOME_DA_VARIAVEL}} no conteúdo para campos dinâmicos."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome <span className="text-red-500">*</span></label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Declaração de idoneidade" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria <span className="text-red-500">*</span></label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v ?? "" })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do modelo" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Conteúdo <span className="text-red-500">*</span></label>
              <Textarea value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder={"Declaramos que a empresa {{EMPRESA_NOME}}, inscrita no CNPJ {{EMPRESA_CNPJ}}..."} rows={10} className="font-mono text-xs" />
              <p className="text-[11px] text-slate-400">Use {"{{VARIAVEL}}"} para campos dinâmicos. Aceita HTML.</p>
            </div>
            {varsConteudo.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Variáveis encontradas:</label>
                <div className="flex flex-wrap gap-1">{varsConteudo.map((v) => <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>)}</div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Sugestões de variáveis:</label>
              <div className="flex flex-wrap gap-1">
                {VARIAVEIS_SUGERIDAS.map((v) => (
                  <button key={v} type="button" className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50"
                    onClick={() => setForm((p) => ({ ...p, conteudo: p.conteudo + `{{${v}}}` }))}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
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
