"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink, Save, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoEditavel } from "./CampoEditavel";
import { TimelineMovimentos } from "./TimelineMovimentos";
import { BotaoIa } from "./BotaoIa";
import { RespostaIa, RespostaIaPreview } from "./RespostaIa";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AcaoIa } from "@/types/licitacao";

interface LicitacaoDrawerProps {
  licitacaoId: string;
  onClose: () => void;
}

type IaPreview = {
  tipo: string;
  resposta: string;
  respostaJson: Record<string, unknown> | null;
  modelo: string;
};

function ResumoScoreParecer({ licitacaoId }: { licitacaoId: string }) {
  const { data: score } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score-resumo", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const { data: parecer } = useQuery<Record<string, unknown> | null>({
    queryKey: ["parecer-resumo", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const COR: Record<string, string> = {
    "A+": "bg-emerald-700 text-white",
    A: "bg-blue-600 text-white",
    B: "bg-yellow-500 text-white",
    C: "bg-orange-500 text-white",
    D: "bg-red-600 text-white",
  };

  const hasData = score || parecer;

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      {score && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${COR[String(score.classificacao)] ?? "bg-slate-400 text-white"}`}>
            {String(score.classificacao)}
          </span>
          <span className="text-sm font-semibold">{Number(score.scoreFinal)}/100</span>
        </div>
      )}
      {parecer && (
        <div className="text-xs text-slate-600">
          {parecer.prioridadeComercial && <span>Prioridade: {String(parecer.prioridadeComercial)}</span>}
          {parecer.valeEsforcoComercial != null && (
            <span className="ml-2">Vale esforco: {parecer.valeEsforcoComercial ? "Sim" : "Nao"}</span>
          )}
        </div>
      )}
      <a
        href={`/licitacoes/${licitacaoId}`}
        className="text-xs text-blue-600 hover:underline"
      >
        {hasData ? "Ver analise completa →" : "Analisar →"}
      </a>
    </div>
  );
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

  // Preview da IA (ainda não gravado)
  const [iaPreview, setIaPreview] = useState<IaPreview | null>(null);

  // Mover card de coluna
  const [motivoMover, setMotivoMover] = useState("");
  const [colunaPendente, setColunaPendente] = useState<{ id: string; nome: string; tipo: string } | null>(null);

  const { data: colunas = [] } = useQuery<{ id: string; nome: string; cor: string; tipo: string }[]>({
    queryKey: ["colunas"],
    queryFn: async () => {
      const r = await fetch("/api/colunas");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro");
      return data;
    },
    enabled: !isNova,
  });

  const moverMutation = useMutation({
    mutationFn: (data: { cardId: string; colunaDestinoId: string; motivo?: string }) =>
      fetch("/api/kanban/mover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Card movido!");
      setColunaPendente(null);
      setMotivoMover("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleMoverColuna(colunaDestinoId: string) {
    if (!licitacao?.card) return;
    if (colunaDestinoId === licitacao.card.coluna?.id) return;

    const colDestino = colunas.find((c) => c.id === colunaDestinoId);
    if (!colDestino) return;

    if (colDestino.tipo === "final_negativo") {
      setColunaPendente(colDestino);
    } else {
      moverMutation.mutate({ cardId: licitacao.card.id, colunaDestinoId });
    }
  }

  function confirmarMover() {
    if (!colunaPendente || !licitacao?.card || !motivoMover.trim()) return;
    moverMutation.mutate({
      cardId: licitacao.card.id,
      colunaDestinoId: colunaPendente.id,
      motivo: motivoMover.trim(),
    });
  }

  const { data: licitacao } = useQuery({
    queryKey: ["licitacao", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar licitação");
      return data;
    },
    enabled: !isNova,
  });

  const criarMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok)
          return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
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
        if (!r.ok)
          return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
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

  // Gravar resultado da IA no histórico
  const gravarIaMutation = useMutation({
    mutationFn: async (preview: IaPreview) => {
      const r = await fetch("/api/ia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licitacaoId,
          tipo: preview.tipo,
          gravar: true,
          resposta: preview.resposta,
          respostaJson: preview.respostaJson,
          modelo: preview.modelo,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao gravar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      setIaPreview(null);
      toast.success("Análise gravada no histórico da licitação!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleIaResult(result: {
    tipo: string;
    resposta: string;
    respostaJson: Record<string, unknown> | null;
    modelo: string;
    acaoId: string;
  }) {
    setIaPreview({
      tipo: result.tipo,
      resposta: result.resposta,
      respostaJson: result.respostaJson,
      modelo: result.modelo,
    });
  }

  function descartarPreview() {
    setIaPreview(null);
    toast.info("Análise descartada.");
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
                    Cole o texto do edital ou informações da licitação. A IA extrairá os dados
                    automaticamente.
                  </p>
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={12}
                    placeholder="Cole aqui o texto do edital, link, ou qualquer informação da licitação..."
                    value={novaForm.textoImportar}
                    onChange={(e) =>
                      setNovaForm({ ...novaForm, textoImportar: e.target.value })
                    }
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
                    <Input
                      value={novaForm.titulo}
                      onChange={(e) => setNovaForm({ ...novaForm, titulo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Órgão</label>
                    <Input
                      value={novaForm.orgao}
                      onChange={(e) => setNovaForm({ ...novaForm, orgao: e.target.value })}
                    />
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
                      <Input
                        value={novaForm.modalidade}
                        onChange={(e) =>
                          setNovaForm({ ...novaForm, modalidade: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">UF</label>
                      <Input
                        value={novaForm.uf}
                        onChange={(e) => setNovaForm({ ...novaForm, uf: e.target.value })}
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">
                      Valor Estimado (R$)
                    </label>
                    <Input
                      type="number"
                      value={novaForm.valorEstimado}
                      onChange={(e) =>
                        setNovaForm({ ...novaForm, valorEstimado: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    onClick={() =>
                      criarMutation.mutate({
                        titulo: novaForm.titulo,
                        orgao: novaForm.orgao || null,
                        objeto: novaForm.objeto || null,
                        modalidade: novaForm.modalidade || null,
                        uf: novaForm.uf || null,
                        valorEstimado: novaForm.valorEstimado
                          ? Number(novaForm.valorEstimado)
                          : null,
                      })
                    }
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
              <div className="flex flex-wrap items-center gap-2">
                {licitacao.numero && (
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                    #{licitacao.numero}
                  </span>
                )}
                {licitacao.card && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        className="rounded-md border px-2 py-1 text-xs font-medium text-white cursor-pointer"
                        style={{ backgroundColor: licitacao.card.coluna?.cor ?? "#3B82F6" }}
                        value={licitacao.card.coluna?.id ?? ""}
                        onChange={(e) => handleMoverColuna(e.target.value)}
                      >
                        {colunas.map((col) => (
                          <option key={col.id} value={col.id} style={{ backgroundColor: "#fff", color: "#333" }}>
                            {col.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    {licitacao.card.urgente && <Badge variant="destructive">Urgente</Badge>}
                  </>
                )}
              </div>

              {/* Modal inline de motivo para coluna final negativa */}
              {colunaPendente && (
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    Por que está movendo para &quot;{colunaPendente.nome}&quot;?
                  </p>
                  <Textarea
                    placeholder="Ex: Licitação cancelada, prazo expirado, não atende requisitos..."
                    value={motivoMover}
                    onChange={(e) => setMotivoMover(e.target.value)}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmarMover} disabled={!motivoMover.trim()}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setColunaPendente(null); setMotivoMover(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {licitacao.linkOrigem && (() => {
                // Converte linkOrigem legado (pncp-contrato:ID) em URL real
                let href = licitacao.linkOrigem as string;
                if (href.startsWith("pncp-contrato:")) {
                  const id = href.replace("pncp-contrato:", "");
                  href = `https://pncp.gov.br/app/editais/${id}`;
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir edital original
                  </a>
                );
              })()}

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Dados da Licitação
                </h3>
                <CampoEditavel
                  label="Título"
                  valor={licitacao.titulo}
                  onSave={(v: string) => updateMutation.mutate({ titulo: v })}
                />
                <CampoEditavel
                  label="Órgão"
                  valor={licitacao.orgao}
                  onSave={(v: string) => updateMutation.mutate({ orgao: v })}
                />
                <CampoEditavel
                  label="Objeto"
                  valor={licitacao.objeto}
                  onSave={(v: string) => updateMutation.mutate({ objeto: v })}
                  multiline
                />
                <CampoEditavel
                  label="Modalidade"
                  valor={licitacao.modalidade}
                  onSave={(v: string) => updateMutation.mutate({ modalidade: v })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CampoEditavel
                    label="UF"
                    valor={licitacao.uf}
                    onSave={(v: string) => updateMutation.mutate({ uf: v })}
                  />
                  <CampoEditavel
                    label="Município"
                    valor={licitacao.municipio}
                    onSave={(v: string) => updateMutation.mutate({ municipio: v })}
                  />
                </div>
                <CampoEditavel
                  label="Observações"
                  valor={licitacao.observacoes}
                  onSave={(v: string) => updateMutation.mutate({ observacoes: v })}
                  multiline
                />
                <ResumoScoreParecer licitacaoId={licitacaoId} />
              </section>

              {/* ── Assistente IA ── */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Assistente IA</h3>
                <div className="flex flex-wrap gap-2">
                  <BotaoIa
                    licitacaoId={licitacaoId}
                    tipo="triagem"
                    label="Triagem"
                    onResult={handleIaResult}
                    disabled={!!iaPreview}
                  />
                  <BotaoIa
                    licitacaoId={licitacaoId}
                    tipo="analise"
                    label="Analisar"
                    onResult={handleIaResult}
                    disabled={!!iaPreview}
                  />
                  <BotaoIa
                    licitacaoId={licitacaoId}
                    tipo="proposta"
                    label="Sugerir Proposta"
                    onResult={handleIaResult}
                    disabled={!!iaPreview}
                  />
                </div>
              </section>

              {/* ── Preview da IA (aguardando gravar/descartar) ── */}
              {iaPreview && (
                <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-amber-800">
                      Resultado da IA — Salvar ou descartar?
                    </h3>
                  </div>

                  <RespostaIaPreview
                    tipo={iaPreview.tipo}
                    resposta={iaPreview.resposta}
                    respostaJson={iaPreview.respostaJson}
                    modelo={iaPreview.modelo}
                  />

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => gravarIaMutation.mutate(iaPreview)}
                      disabled={gravarIaMutation.isPending}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {gravarIaMutation.isPending
                        ? "Gravando..."
                        : "Gravar no histórico"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={descartarPreview}
                      disabled={gravarIaMutation.isPending}
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar
                    </Button>
                  </div>
                </section>
              )}

              {/* ── Histórico de análises gravadas ── */}
              {licitacao.acoesIa && licitacao.acoesIa.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Análises gravadas
                  </h3>
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

              {licitacao.dadosExtraidos &&
                Object.keys(licitacao.dadosExtraidos).length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      Dados Extraídos (IA)
                    </h3>
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
