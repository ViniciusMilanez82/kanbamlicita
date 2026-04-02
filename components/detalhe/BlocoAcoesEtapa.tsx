"use client";

import { BotaoIa } from "./BotaoIa";
import { Button } from "@/components/ui/button";
import { Search, FileSearch, FileCheck, Scale, FileEdit, BarChart3 } from "lucide-react";

type TipoIa = "triagem" | "analise" | "proposta" | "generico";

const ACAO_CONFIG: Record<string, { label: string; icone: React.ReactNode; tipoIa?: TipoIa; cor?: string }> = {
  triagem_ia: { label: "Triagem IA", icone: <Search className="h-3.5 w-3.5" />, tipoIa: "triagem", cor: "bg-blue-600 hover:bg-blue-700 text-white" },
  analise_profunda: { label: "Análise Profunda", icone: <FileSearch className="h-3.5 w-3.5" />, cor: "bg-amber-500 hover:bg-amber-600 text-white" },
  checar_habilitacao: { label: "Checar Habilitação", icone: <FileCheck className="h-3.5 w-3.5" />, cor: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  sugerir_proposta: { label: "Sugerir Proposta", icone: <BarChart3 className="h-3.5 w-3.5" />, tipoIa: "proposta", cor: "bg-purple-600 hover:bg-purple-700 text-white" },
  analise_juridica: { label: "Análise Jurídica", icone: <Scale className="h-3.5 w-3.5" />, tipoIa: "generico", cor: "bg-violet-600 hover:bg-violet-700 text-white" },
  redigir_impugnacao: { label: "Redigir Impugnação", icone: <FileEdit className="h-3.5 w-3.5" />, tipoIa: "generico" },
  resumo_executivo: { label: "Resumo Executivo", icone: <BarChart3 className="h-3.5 w-3.5" /> },
};

interface BlocoAcoesEtapaProps {
  licitacaoId: string;
  acoesPadrao: string[];
  onIaResult?: (result: { tipo: string; resposta: string; respostaJson: Record<string, unknown> | null; modelo: string; acaoId: string }) => void;
  onAnaliseProfunda?: () => void;
  onChecarHabilitacao?: () => void;
}

export function BlocoAcoesEtapa({ licitacaoId, acoesPadrao, onIaResult, onAnaliseProfunda, onChecarHabilitacao }: BlocoAcoesEtapaProps) {
  if (acoesPadrao.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-slate-500 mb-1">Ações desta etapa</div>
      <div className="flex flex-wrap gap-2">
        {acoesPadrao.map((acao, idx) => {
          const config = ACAO_CONFIG[acao];
          if (!config) return null;

          if (config.tipoIa && onIaResult) {
            return <BotaoIa key={acao} licitacaoId={licitacaoId} tipo={config.tipoIa} label={config.label} onResult={onIaResult} />;
          }

          if (acao === "analise_profunda" && onAnaliseProfunda) {
            return (
              <Button key={acao} size="sm" className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`} variant={idx === 0 ? "default" : "outline"} onClick={onAnaliseProfunda}>
                {config.icone} {config.label}
              </Button>
            );
          }

          if (acao === "checar_habilitacao" && onChecarHabilitacao) {
            return (
              <Button key={acao} size="sm" className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`} variant={idx === 0 ? "default" : "outline"} onClick={onChecarHabilitacao}>
                {config.icone} {config.label}
              </Button>
            );
          }

          return (
            <Button key={acao} size="sm" variant={idx === 0 ? "default" : "outline"} className={`gap-1.5 text-xs ${idx === 0 ? config.cor ?? "" : ""}`}>
              {config.icone} {config.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
