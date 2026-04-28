"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSearch,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ResumoLicitacaoData } from "@/lib/analise-profunda/types";

interface AnaliseProfundaProps {
  licitacaoId: string;
}

const STATUS_MAP: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  nenhuma: { label: "Não realizada", cor: "bg-slate-100 text-slate-600", icon: <FileSearch className="h-3.5 w-3.5" /> },
  processando: { label: "Em andamento", cor: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  buscando_detalhes: { label: "Buscando detalhes", cor: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  baixando_documentos: { label: "Baixando docs", cor: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  extraindo_texto: { label: "Extraindo texto", cor: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  analisando_ia: { label: "Analisando com IA", cor: "bg-purple-100 text-purple-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  concluido: { label: "Concluída", cor: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  erro: { label: "Erro", cor: "bg-red-100 text-red-700", icon: <XCircle className="h-3.5 w-3.5" /> },
};

function SecaoColapsavel({
  titulo,
  children,
  defaultAberto = false,
}: {
  titulo: string;
  children: React.ReactNode;
  defaultAberto?: boolean;
}) {
  const [aberto, setAberto] = useState(defaultAberto);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {titulo}
      </button>
      {aberto && <div className="pb-3 pl-6">{children}</div>}
    </div>
  );
}

function CampoResumo({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="mb-1.5">
      <span className="text-xs font-medium text-slate-500">{label}:</span>{" "}
      <span className="text-sm text-slate-800">{valor}</span>
    </div>
  );
}

export function AnaliseProfunda({ licitacaoId }: AnaliseProfundaProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    status: string;
    dados: ResumoLicitacaoData | null;
    texto: string | null;
    modelo: string | null;
    erro: string | null;
    criadoEm: string | null;
    documentos: { id: string; nome: string; tipo: string; tamanho: number }[];
  }>({
    queryKey: ["analise-profunda", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise-profunda`);
      return r.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Refetch a cada 3s enquanto processando
      if (status && !["concluido", "erro", "nenhuma"].includes(status)) return 3000;
      return false;
    },
  });

  const dispararMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise-profunda`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analise-profunda", licitacaoId] });
      toast.success("Análise profunda iniciada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = data?.status ?? "nenhuma";
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.nenhuma;
  const resumo = data?.dados;
  const processando = !["concluido", "erro", "nenhuma"].includes(status);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border bg-slate-50 p-3">
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <section className="rounded-lg border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">Análise Profunda</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cor}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispararMutation.mutate()}
          disabled={processando || dispararMutation.isPending}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${processando ? "animate-spin" : ""}`} />
          {status === "nenhuma" ? "Analisar" : "Reanalisar"}
        </Button>
      </div>

      {/* Erro */}
      {status === "erro" && data?.erro && (
        <div className="mx-4 my-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {data.erro}
        </div>
      )}

      {/* Processando */}
      {processando && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analisando... {statusInfo.label}
        </div>
      )}

      {/* Resultado */}
      {resumo && status === "concluido" && (
        <div className="px-4 py-3 space-y-1">
          {/* Resumo rápido */}
          <div className="rounded-md bg-blue-50 p-3 mb-3">
            <p className="text-sm font-medium text-blue-900 mb-1">{resumo.objetoResumido}</p>
            <div className="flex flex-wrap gap-2 text-xs text-blue-700">
              {resumo.modalidade && <Badge variant="outline">{resumo.modalidade}</Badge>}
              {resumo.tipo && <Badge variant="outline">{resumo.tipo}</Badge>}
              {resumo.criterioJulgamento && <Badge variant="outline">{resumo.criterioJulgamento}</Badge>}
              {resumo.valorEstimado && <Badge variant="outline">{resumo.valorEstimado}</Badge>}
            </div>
          </div>

          {/* Seções colapsáveis */}
          <SecaoColapsavel titulo="📋 Dados Gerais" defaultAberto>
            <CampoResumo label="Cliente" valor={resumo.cliente} />
            <CampoResumo label="Modalidade" valor={resumo.modalidade} />
            <CampoResumo label="Número" valor={resumo.numero} />
            <CampoResumo label="Portal" valor={resumo.portal} />
            <CampoResumo label="Data Publicação" valor={resumo.dataPublicacao} />
            <CampoResumo label="Data Sessão" valor={resumo.dataSessao} />
            <CampoResumo label="Valor Estimado" valor={resumo.valorEstimado} />
          </SecaoColapsavel>

          <SecaoColapsavel titulo="📝 Objeto">
            <p className="text-sm text-slate-700 whitespace-pre-line">{resumo.objeto}</p>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="⚙️ Condições">
            <CampoResumo label="Critério de Julgamento" valor={resumo.criterioJulgamento} />
            <CampoResumo label="Modo de Disputa" valor={resumo.modoDisputa} />
            <CampoResumo label="Intervalo de Lances" valor={resumo.intervaloLances} />
            <CampoResumo label="Validade da Proposta" valor={resumo.validadeProposta} />
            <CampoResumo label="Prazo de Entrega" valor={resumo.prazoEntrega} />
            <CampoResumo label="Local de Entrega" valor={resumo.localEntrega} />
            <CampoResumo label="Período de Locação" valor={resumo.periodoLocacao} />
            <CampoResumo label="Visita Técnica" valor={resumo.visitaTecnica} />
            <CampoResumo label="ART/CREA" valor={resumo.artCrea} />
          </SecaoColapsavel>

          {resumo.itens && resumo.itens.length > 0 && (
            <SecaoColapsavel titulo={`📦 Itens (${resumo.itens.length})`}>
              <div className="space-y-1.5">
                {resumo.itens.map((item, i) => (
                  <div key={i} className="rounded bg-slate-50 p-2 text-xs">
                    <span className="font-medium text-slate-600">Item {item.numero}:</span>{" "}
                    <span className="text-slate-800">{item.descricao}</span>
                    {item.quantidade && <span className="ml-2 text-slate-500">Qtd: {item.quantidade}</span>}
                    {item.valorTotal && <span className="ml-2 text-slate-500">{item.valorTotal}</span>}
                  </div>
                ))}
              </div>
            </SecaoColapsavel>
          )}

          <SecaoColapsavel titulo="📎 Habilitação">
            {resumo.habilitacao?.juridica?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-600">Jurídica:</span>
                <ul className="ml-3 mt-0.5 text-xs text-slate-700 list-disc">
                  {resumo.habilitacao.juridica.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {resumo.habilitacao?.tecnica?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-600">Técnica:</span>
                <ul className="ml-3 mt-0.5 text-xs text-slate-700 list-disc">
                  {resumo.habilitacao.tecnica.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {resumo.habilitacao?.fiscal?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-600">Fiscal:</span>
                <ul className="ml-3 mt-0.5 text-xs text-slate-700 list-disc">
                  {resumo.habilitacao.fiscal.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {resumo.habilitacao?.economica?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-600">Econômica:</span>
                <ul className="ml-3 mt-0.5 text-xs text-slate-700 list-disc">
                  {resumo.habilitacao.economica.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {resumo.habilitacao?.declaracoes?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-600">Declarações:</span>
                <ul className="ml-3 mt-0.5 text-xs text-slate-700 list-disc">
                  {resumo.habilitacao.declaracoes.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </SecaoColapsavel>

          {/* Riscos e Oportunidades */}
          {(resumo.riscos?.length > 0 || resumo.oportunidades?.length > 0) && (
            <SecaoColapsavel titulo="⚡ Riscos & Oportunidades" defaultAberto>
              {resumo.riscos?.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">Riscos:</span>
                  </div>
                  <ul className="ml-5 text-xs text-slate-700 list-disc">
                    {resumo.riscos.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {resumo.oportunidades?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700">Oportunidades:</span>
                  </div>
                  <ul className="ml-5 text-xs text-slate-700 list-disc">
                    {resumo.oportunidades.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
            </SecaoColapsavel>
          )}

          {/* Documentos baixados */}
          {data?.documentos && data.documentos.length > 0 && (
            <SecaoColapsavel titulo={`📄 Documentos Baixados (${data.documentos.length})`}>
              <div className="space-y-1">
                {data.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{doc.nome}</span>
                    <span className="text-slate-400">({(doc.tamanho / 1024).toFixed(0)} KB)</span>
                  </div>
                ))}
              </div>
            </SecaoColapsavel>
          )}

          {/* Metadados */}
          <div className="flex items-center gap-3 pt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data?.criadoEm ? new Date(data.criadoEm).toLocaleString("pt-BR") : "—"}
            </span>
            {data?.modelo && <span>Modelo: {data.modelo}</span>}
          </div>
        </div>
      )}

      {/* Sem análise */}
      {status === "nenhuma" && (
        <div className="px-4 py-4 text-center text-sm text-slate-400">
          Clique em &quot;Analisar&quot; para buscar detalhes e documentos do PNCP e gerar um resumo completo com IA.
        </div>
      )}
    </section>
  );
}
