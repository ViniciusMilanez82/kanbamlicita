"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoEditavel } from "./CampoEditavel";
import { TimelineMovimentos } from "./TimelineMovimentos";
import { BotaoIa } from "./BotaoIa";
import { RespostaIa } from "./RespostaIa";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AcaoIa } from "@/types/licitacao";

interface LicitacaoDrawerProps {
  licitacaoId: string;
  onClose: () => void;
}

export function LicitacaoDrawer({ licitacaoId, onClose }: LicitacaoDrawerProps) {
  const queryClient = useQueryClient();
  const isNova = licitacaoId === "nova";

  const [novaForm, setNovaForm] = useState({
    titulo: "",
    orgao: "",
    objeto: "",
    modalidade: "",
    uf: "",
    valorEstimado: "",
    textoImportar: "",
  });
  const [modoImportar, setModoImportar] = useState(false);

  const { data: licitacao } = useQuery({
    queryKey: ["licitacao", licitacaoId],
    queryFn: () => fetch(`/api/licitacoes/${licitacaoId}`).then((r) => r.json()),
    enabled: !isNova,
  });

  const criarMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Licitação criada!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importarMutation = useMutation({
    mutationFn: (texto: string) =>
      fetch("/api/licitacoes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Licitação importada com IA!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/licitacoes/${licitacaoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Atualizado!");
    },
  });

  function handleIaResult(_result: Record<string, unknown>) {
    queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            {isNova ? "Nova Licitação" : licitacao?.titulo ?? "Carregando..."}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isNova ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={modoImportar ? "outline" : "default"}
                  onClick={() => setModoImportar(false)}
                >
                  Manual
                </Button>
                <Button
                  size="sm"
                  variant={modoImportar ? "default" : "outline"}
                  onClick={() => setModoImportar(true)}
                >
                  Importar com IA
                </Button>
              </div>

              {modoImportar ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Cole o texto do edital ou informações da licitação. A IA extrairá os dados automaticamente.
                  </p>
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={12}
                    placeholder="Cole aqui o texto do edital, link, ou qualquer informação da licitação..."
                    value={novaForm.textoImportar}
                    onChange={(e) => setNovaForm({ ...novaForm, textoImportar: e.target.value })}
                  />
                  <Button
                    onClick={() => importarMutation.mutate(novaForm.textoImportar)}
                    disabled={!novaForm.textoImportar || importarMutation.isPending}
                    className="w-full"
                  >
                    {importarMutation.isPending ? "Extraindo com IA..." : "Importar com IA"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Título *</label>
                    <Input value={novaForm.titulo} onChange={(e) => setNovaForm({ ...novaForm, titulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Órgão</label>
                    <Input value={novaForm.orgao} onChange={(e) => setNovaForm({ ...novaForm, orgao: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Objeto</label>
                    <textarea
                      className="w-full rounded border px-3 py-2 text-sm"
                      rows={3}
                      value={novaForm.objeto}
                      onChange={(e) => setNovaForm({ ...novaForm, objeto: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Modalidade</label>
                      <Input value={novaForm.modalidade} onChange={(e) => setNovaForm({ ...novaForm, modalidade: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">UF</label>
                      <Input value={novaForm.uf} onChange={(e) => setNovaForm({ ...novaForm, uf: e.target.value })} maxLength={2} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Valor Estimado (R$)</label>
                    <Input type="number" value={novaForm.valorEstimado} onChange={(e) => setNovaForm({ ...novaForm, valorEstimado: e.target.value })} />
                  </div>
                  <Button
                    onClick={() => criarMutation.mutate({
                      titulo: novaForm.titulo,
                      orgao: novaForm.orgao || null,
                      objeto: novaForm.objeto || null,
                      modalidade: novaForm.modalidade || null,
                      uf: novaForm.uf || null,
                      valorEstimado: novaForm.valorEstimado ? Number(novaForm.valorEstimado) : null,
                    })}
                    disabled={!novaForm.titulo || criarMutation.isPending}
                    className="w-full"
                  >
                    Criar Licitação
                  </Button>
                </div>
              )}
            </div>
          ) : licitacao ? (
            <div className="space-y-6">
              {licitacao.card && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge style={{ backgroundColor: licitacao.card.coluna?.cor }} className="text-white">
                    {licitacao.card.coluna?.nome}
                  </Badge>
                  {licitacao.card.urgente && <Badge variant="destructive">Urgente</Badge>}
                </div>
              )}

              {licitacao.linkOrigem && (
                <a
                  href={licitacao.linkOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir edital original
                </a>
              )}

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Dados da Licitação</h3>
                <CampoEditavel label="Título" valor={licitacao.titulo} onSave={(v: string) => updateMutation.mutate({ titulo: v })} />
                <CampoEditavel label="Órgão" valor={licitacao.orgao} onSave={(v: string) => updateMutation.mutate({ orgao: v })} />
                <CampoEditavel label="Objeto" valor={licitacao.objeto} onSave={(v: string) => updateMutation.mutate({ objeto: v })} multiline />
                <CampoEditavel label="Modalidade" valor={licitacao.modalidade} onSave={(v: string) => updateMutation.mutate({ modalidade: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoEditavel label="UF" valor={licitacao.uf} onSave={(v: string) => updateMutation.mutate({ uf: v })} />
                  <CampoEditavel label="Município" valor={licitacao.municipio} onSave={(v: string) => updateMutation.mutate({ municipio: v })} />
                </div>
                <CampoEditavel label="Observações" valor={licitacao.observacoes} onSave={(v: string) => updateMutation.mutate({ observacoes: v })} multiline />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Assistente IA</h3>
                <div className="flex flex-wrap gap-2">
                  <BotaoIa licitacaoId={licitacaoId} tipo="triagem" label="Triagem" onResult={handleIaResult} />
                  <BotaoIa licitacaoId={licitacaoId} tipo="analise" label="Analisar" onResult={handleIaResult} />
                  <BotaoIa licitacaoId={licitacaoId} tipo="proposta" label="Sugerir Proposta" onResult={handleIaResult} />
                </div>
              </section>

              {licitacao.acoesIa && licitacao.acoesIa.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Resultados da IA</h3>
                  <div className="space-y-3">
                    {licitacao.acoesIa
                      .filter((a: AcaoIa) => a.status === "concluido")
                      .map((a: AcaoIa) => (
                        <RespostaIa key={a.id} acao={a} />
                      ))}
                  </div>
                </section>
              )}

              {licitacao.movimentacoes && licitacao.movimentacoes.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Histórico</h3>
                  <TimelineMovimentos movimentacoes={licitacao.movimentacoes} />
                </section>
              )}

              {licitacao.dadosExtraidos && Object.keys(licitacao.dadosExtraidos).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Dados Extraídos (IA)</h3>
                  <pre className="rounded bg-slate-50 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(licitacao.dadosExtraidos, null, 2)}
                  </pre>
                </section>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Carregando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
