"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileWarning,
  Bell,
} from "lucide-react";
import { AlertaBadge } from "./AlertaBadge";

type DiagnosticoIA = {
  diagnostico: {
    score_saude: number;
    resumo: string;
    riscos_criticos: string[];
  };
  documentos_atencao: {
    tipoDocumento: string;
    cnpj: string;
    situacao: string;
    diasRestantes: number | null;
    acao_recomendada: string;
    prioridade: string;
    orgao_emissao: string;
    prazo_emissao_estimado: string;
  }[];
  alertas_sugeridos: {
    tipoDocumento: string;
    diasVerde: number;
    diasAmarelo: number;
    diasLaranja: number;
    diasVermelho: number;
    diasPreto: number;
    justificativa: string;
  }[];
  documentos_faltantes: {
    tipoDocumento: string;
    categoria: string;
    obrigatoriedade: string;
    como_obter: string;
  }[];
  recomendacoes_gerais: string[];
};

type AnaliseResponse = {
  analise: DiagnosticoIA;
  modelo: string;
  totalDocumentos: number;
  tiposSemConfig: string[];
};

const PRIORIDADE_COR: Record<string, string> = {
  critica: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-slate-100 text-slate-600",
};

const SITUACAO_ALERTA: Record<string, string> = {
  vencido: "preto",
  vencendo: "vermelho",
  ausente_provavel: "laranja",
};

function ScoreBadge({ score }: { score: number }) {
  const cor =
    score >= 90
      ? "text-emerald-700 bg-emerald-100 border-emerald-200"
      : score >= 70
        ? "text-amber-700 bg-amber-100 border-amber-200"
        : "text-red-700 bg-red-100 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-lg font-bold ${cor}`}>
      {score}%
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {count !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t px-4 py-3">{children}</div>}
    </div>
  );
}

export function AnaliseIaPanel() {
  const queryClient = useQueryClient();
  const [resultado, setResultado] = useState<AnaliseResponse | null>(null);
  const [alertasSelecionados, setAlertasSelecionados] = useState<Set<number>>(new Set());

  const analiseMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/documentos-empresa/analise-ia", {
        method: "POST",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Erro na análise" }));
        throw new Error(err.error || "Erro na análise de IA");
      }
      return r.json() as Promise<AnaliseResponse>;
    },
    onSuccess: (data) => {
      setResultado(data);
      // Selecionar todos os alertas sugeridos por padrão
      setAlertasSelecionados(
        new Set(data.analise.alertas_sugeridos.map((_, i) => i))
      );
    },
  });

  const aplicarMutation = useMutation({
    mutationFn: async () => {
      if (!resultado) throw new Error("Sem resultado");
      const alertas = resultado.analise.alertas_sugeridos.filter((_, i) =>
        alertasSelecionados.has(i)
      );
      const r = await fetch("/api/documentos-empresa/aplicar-sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertas }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || "Erro ao aplicar");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-alertas-doc"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-empresa-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-empresa"] });
    },
  });

  function toggleAlerta(idx: number) {
    setAlertasSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // Estado inicial — só o botão
  if (!resultado && !analiseMutation.isPending) {
    return (
      <div className="rounded-xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Análise inteligente de documentos
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              A IA analisa todos os documentos cadastrados, verifica vencimentos,
              identifica documentos faltantes para licitações e sugere
              configurações de alerta personalizadas.
            </p>
          </div>
          <Button
            onClick={() => analiseMutation.mutate()}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            Analisar com IA
          </Button>
          {analiseMutation.isError && (
            <p className="text-sm text-red-600">
              {analiseMutation.error?.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading
  if (analiseMutation.isPending) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-blue-700">
            Analisando documentos com IA...
          </p>
          <p className="text-xs text-blue-500">
            Verificando vencimentos, identificando riscos e gerando sugestões
          </p>
        </div>
      </div>
    );
  }

  // Resultado
  if (!resultado) return null;
  const { analise } = resultado;

  return (
    <div className="space-y-4">
      {/* Header com resultado */}
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
        <div className="flex items-center gap-4">
          <Brain className="h-6 w-6 text-blue-600" />
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Diagnóstico IA
              </h3>
              <ScoreBadge score={analise.diagnostico.score_saude} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {analise.diagnostico.resumo}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => analiseMutation.mutate()}
            className="gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Reanalisar
          </Button>
          <button
            onClick={() => setResultado(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Riscos críticos */}
      {analise.diagnostico.riscos_criticos.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">
              Riscos críticos
            </span>
          </div>
          <ul className="space-y-1">
            {analise.diagnostico.riscos_criticos.map((risco, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {risco}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documentos que precisam de atenção */}
      {analise.documentos_atencao.length > 0 && (
        <Section
          title="Documentos que precisam de atenção"
          icon={AlertTriangle}
          count={analise.documentos_atencao.length}
        >
          <div className="space-y-2">
            {analise.documentos_atencao.map((doc, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <AlertaBadge
                  nivel={SITUACAO_ALERTA[doc.situacao] ?? "amarelo"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {doc.tipoDocumento}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_COR[doc.prioridade] ?? PRIORIDADE_COR.media}`}
                    >
                      {doc.prioridade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {doc.acao_recomendada}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span>Emissão: {doc.orgao_emissao}</span>
                    <span>Prazo: {doc.prazo_emissao_estimado}</span>
                    {doc.diasRestantes !== null && (
                      <span className="font-medium">
                        {doc.diasRestantes <= 0
                          ? `Vencido há ${Math.abs(doc.diasRestantes)} dia(s)`
                          : `${doc.diasRestantes} dia(s) restantes`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sugestões de alertas — com botão de aplicar */}
      {analise.alertas_sugeridos.length > 0 && (
        <Section
          title="Configurações de alerta sugeridas"
          icon={Bell}
          count={analise.alertas_sugeridos.length}
        >
          <div className="space-y-2">
            {analise.alertas_sugeridos.map((alerta, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  alertasSelecionados.has(i)
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-100 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={alertasSelecionados.has(i)}
                  onChange={() => toggleAlerta(i)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {alerta.tipoDocumento}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {[
                      { label: "Verde", dias: alerta.diasVerde, cor: "bg-emerald-100 text-emerald-700" },
                      { label: "Amarelo", dias: alerta.diasAmarelo, cor: "bg-yellow-100 text-yellow-700" },
                      { label: "Laranja", dias: alerta.diasLaranja, cor: "bg-orange-100 text-orange-700" },
                      { label: "Vermelho", dias: alerta.diasVermelho, cor: "bg-red-100 text-red-700" },
                    ].map((n) => (
                      <span
                        key={n.label}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${n.cor}`}
                      >
                        {n.label}: {n.dias}d
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {alerta.justificativa}
                  </p>
                </div>
              </label>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                {alertasSelecionados.size} de {analise.alertas_sugeridos.length}{" "}
                selecionados
              </p>
              <Button
                onClick={() => aplicarMutation.mutate()}
                disabled={
                  alertasSelecionados.size === 0 || aplicarMutation.isPending
                }
                className="gap-2"
                size="sm"
              >
                {aplicarMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {aplicarMutation.isPending
                  ? "Aplicando..."
                  : aplicarMutation.isSuccess
                    ? "Aplicado!"
                    : "Aplicar selecionados"}
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* Documentos faltantes */}
      {analise.documentos_faltantes.length > 0 && (
        <Section
          title="Documentos possivelmente faltantes"
          icon={FileWarning}
          count={analise.documentos_faltantes.length}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {analise.documentos_faltantes.map((doc, i) => (
              <div
                key={i}
                className="rounded-lg border border-amber-100 bg-amber-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {doc.tipoDocumento}
                  </p>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 capitalize">
                    {doc.categoria}
                  </span>
                  <span className="text-xs text-slate-500">
                    {doc.obrigatoriedade}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {doc.como_obter}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recomendações gerais */}
      {analise.recomendacoes_gerais.length > 0 && (
        <Section
          title="Recomendações gerais"
          icon={Sparkles}
          defaultOpen={false}
        >
          <ul className="space-y-2">
            {analise.recomendacoes_gerais.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {rec}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer com info do modelo */}
      <p className="text-xs text-slate-400 text-center">
        Análise gerada por {resultado.modelo} com base em{" "}
        {resultado.totalDocumentos} documento(s) cadastrado(s)
      </p>
    </div>
  );
}
