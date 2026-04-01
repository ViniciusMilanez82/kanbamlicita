"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";

type Resumo = {
  totalLicitacoes: number;
  captadasEsteMes: number;
  captadasEstaSemana: number;
  urgentes: number;
  semResponsavel: number;
  comScoreAlto: number;
  valorTotalEstimado: number;
};

type ColunaInfo = {
  id: string;
  nome: string;
  cor: string;
  quantidade: number;
};

type ClassInfo = {
  classificacao: string;
  quantidade: number;
};

type RelatorioData = {
  resumo: Resumo;
  porColuna: ColunaInfo[];
  porClassificacao: ClassInfo[];
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function MetricaCard({
  label,
  valor,
  icon: Icon,
  cor,
}: {
  label: string;
  valor: string | number;
  icon: React.ElementType;
  cor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: cor + "18" }}
      >
        <Icon className="h-5 w-5" style={{ color: cor }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{valor}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

const CLASSIFICACAO_CORES: Record<string, string> = {
  "A+": "#059669",
  A: "#10B981",
  B: "#3B82F6",
  C: "#F59E0B",
  D: "#EF4444",
};

export function RelatoriosClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-funil"],
    queryFn: async () => {
      const r = await fetch("/api/relatorios/funil");
      if (!r.ok) throw new Error("Erro ao carregar relatório");
      return r.json() as Promise<RelatorioData>;
    },
  });

  function handleExportar() {
    window.open("/api/relatorios/exportar", "_blank");
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Carregando relatório...</p>
      </div>
    );
  }

  const { resumo, porColuna, porClassificacao } = data;
  const maxColuna = Math.max(...porColuna.map((c) => c.quantidade), 1);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header + Exportar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Visão geral do funil
          </h2>
          <p className="text-sm text-slate-500">
            Resumo de todas as licitações no sistema.
          </p>
        </div>
        <Button onClick={handleExportar} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricaCard
          label="Total de licitações"
          valor={resumo.totalLicitacoes}
          icon={BarChart3}
          cor="#3B82F6"
        />
        <MetricaCard
          label="Captadas este mês"
          valor={resumo.captadasEsteMes}
          icon={TrendingUp}
          cor="#10B981"
        />
        <MetricaCard
          label="Score A+ ou A"
          valor={resumo.comScoreAlto}
          icon={TrendingUp}
          cor="#059669"
        />
        <MetricaCard
          label="Urgentes"
          valor={resumo.urgentes}
          icon={AlertTriangle}
          cor="#EF4444"
        />
      </div>

      {/* Valor total */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Valor total estimado no pipeline
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {formatarMoeda(resumo.valorTotalEstimado)}
        </p>
      </div>

      {/* Distribuição por coluna */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Distribuição por etapa do Kanban
        </h3>
        <div className="space-y-3">
          {porColuna.map((col) => (
            <div key={col.id} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium text-slate-700 text-right shrink-0">
                {col.nome}
              </span>
              <div className="flex-1 h-7 rounded-lg bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-lg flex items-center px-2 text-xs font-bold text-white transition-all"
                  style={{
                    width: `${Math.max((col.quantidade / maxColuna) * 100, col.quantidade > 0 ? 8 : 0)}%`,
                    backgroundColor: col.cor,
                  }}
                >
                  {col.quantidade > 0 && col.quantidade}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribuição por classificação */}
      {porClassificacao.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Distribuição por classificação de aderência
          </h3>
          <div className="flex flex-wrap gap-3">
            {porClassificacao.map((c) => (
              <div
                key={c.classificacao}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor:
                      CLASSIFICACAO_CORES[c.classificacao] ?? "#6B7280",
                  }}
                >
                  {c.classificacao}
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {c.quantidade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info extras */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-900">Sem responsável</p>
          <p className="text-2xl font-bold text-amber-900">
            {resumo.semResponsavel}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-900">
            Captadas esta semana
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {resumo.captadasEstaSemana}
          </p>
        </div>
      </div>
    </div>
  );
}
