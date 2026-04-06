"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LicitacaoSidebar } from "@/components/licitacao/LicitacaoSidebar";
import { AnaliseTab } from "@/components/licitacao/AnaliseTab";
import { ScoreTab } from "@/components/licitacao/ScoreTab";
import { ParecerTab } from "@/components/licitacao/ParecerTab";
import { HabilitacaoTab } from "@/components/licitacao/HabilitacaoTab";
import { DocumentosTab } from "@/components/licitacao/DocumentosTab";
import { ResultadoTab } from "@/components/licitacao/ResultadoTab";
import { useQuery } from "@tanstack/react-query";

type LicitacaoData = {
  id: string;
  numero: number;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: string | null;
  dataPublicacao: Date | string | null;
  dataSessao: Date | string | null;
  linkOrigem: string | null;
  score: { scoreFinal: number; classificacao: string } | null;
};

const TABS = [
  { id: "analise", label: "Análise" },
  { id: "score", label: "Score" },
  { id: "parecer", label: "Parecer" },
  { id: "habilitacao", label: "Habilitação" },
  { id: "documentos", label: "Documentos" },
  { id: "resultado", label: "Resultado" },
];

export function LicitacaoDetailClient({ licitacao }: { licitacao: LicitacaoData }) {
  const [tab, setTab] = useState("analise");

  // Keep score fresh for sidebar and parecer default
  const { data: scoreAtual } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score", licitacao.id],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacao.id}/score`);
      if (!r.ok) return null;
      return r.json();
    },
    initialData: licitacao.score,
  });

  const scoreResumo = scoreAtual
    ? { scoreFinal: Number((scoreAtual as Record<string, unknown>).scoreFinal ?? 0), classificacao: String((scoreAtual as Record<string, unknown>).classificacao ?? "") }
    : null;

  return (
    <div className="flex h-screen">
      <LicitacaoSidebar
        licitacao={{
          ...licitacao,
          dataPublicacao: licitacao.dataPublicacao ? String(licitacao.dataPublicacao) : null,
          dataSessao: licitacao.dataSessao ? String(licitacao.dataSessao) : null,
        }}
        score={scoreResumo}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "analise" && <AnaliseTab licitacaoId={licitacao.id} />}
        {tab === "score" && <ScoreTab licitacaoId={licitacao.id} />}
        {tab === "parecer" && (
          <ParecerTab
            licitacaoId={licitacao.id}
            classificacaoScore={scoreResumo?.classificacao}
          />
        )}
        {tab === "habilitacao" && <HabilitacaoTab licitacaoId={licitacao.id} />}
        {tab === "documentos" && (
          <DocumentosTab licitacaoId={licitacao.id} />
        )}
        {tab === "resultado" && (
          <ResultadoTab licitacaoId={licitacao.id} />
        )}
      </main>
    </div>
  );
}
