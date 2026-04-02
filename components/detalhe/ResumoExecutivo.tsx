"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ResumoExecutivoProps {
  licitacaoId: string;
}

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

function StatusIcon({ ok }: { ok: boolean | null | undefined }) {
  if (ok === true) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (ok === false) return <XCircle className="h-4 w-4 text-red-500" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
}

export function ResumoExecutivo({ licitacaoId }: ResumoExecutivoProps) {
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

  const { data: analiseProfunda } = useQuery<{ status: string; dados: Record<string, unknown> | null } | null>({
    queryKey: ["analise-profunda", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise-profunda`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const classificacao = score?.classificacao ? String(score.classificacao) : null;
  const scoreFinal = score?.scoreFinal ? Number(score.scoreFinal) : null;
  const habilitacaoOk = analiseProfunda?.dados ? (analiseProfunda.dados as Record<string, unknown>).habilitacao != null : null;

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="text-sm font-bold text-emerald-900">📊 Resumo Executivo</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Score:</span>
          {classificacao ? (
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${COR_CLASSIFICACAO[classificacao] ?? "bg-slate-400 text-white"}`}>
              {classificacao} {scoreFinal != null ? `${scoreFinal}` : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Não calculado</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Parecer:</span>
          {parecer?.classificacaoFinal ? (
            <Badge variant="outline" className="text-xs">{String(parecer.classificacaoFinal)}</Badge>
          ) : (
            <span className="text-xs text-slate-400">Pendente</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon ok={habilitacaoOk} />
          <span className="text-xs">Habilitação</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon ok={parecer?.valeEsforcoComercial as boolean | null} />
          <span className="text-xs">Vale esforço</span>
        </div>
      </div>
      {parecer?.recomendacaoFinal != null && (
        <div className="rounded-md bg-white/70 p-2 text-xs text-slate-700">
          <span className="font-semibold">Recomendação: </span>
          {String(parecer.recomendacaoFinal).slice(0, 200)}
        </div>
      )}
    </div>
  );
}
