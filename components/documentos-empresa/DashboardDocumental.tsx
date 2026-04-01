"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertaBadge } from "./AlertaBadge";
import { Shield, FileCheck, AlertTriangle, XCircle, Clock } from "lucide-react";

type DashboardData = {
  scoreProntidao: number;
  totalDocumentos: number;
  porStatus: { vigente: number; vencendo: number; vencido: number; substituido: number };
  porCategoria: {
    categoria: string;
    total: number;
    vigentes: number;
    vencendo: number;
    vencidos: number;
  }[];
  timeline: {
    id: string;
    tipoDocumento: string;
    cnpj: string;
    dataValidade: string | null;
    nivelAlerta: string | null;
    diasRestantes: number | null;
  }[];
  acoesPendentes: {
    id: string;
    tipoDocumento: string;
    cnpj: string;
    dataValidade: string | null;
    nivelAlerta: string | null;
    diasRestantes: number | null;
    acao: string;
  }[];
};

const CATEGORIA_LABELS: Record<string, string> = {
  juridica: "Jurídica",
  fiscal: "Fiscal",
  trabalhista: "Trabalhista",
  tecnica: "Técnica",
  economica: "Econômica",
  complementar: "Complementar",
};

function ScoreCircle({ score }: { score: number }) {
  const cor =
    score >= 90
      ? "text-emerald-600"
      : score >= 70
        ? "text-amber-500"
        : "text-red-600";
  const bgCor =
    score >= 90
      ? "border-emerald-200 bg-emerald-50"
      : score >= 70
        ? "border-amber-200 bg-amber-50"
        : "border-red-200 bg-red-50";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 p-6 ${bgCor}`}
    >
      <p className={`text-5xl font-bold ${cor}`}>{score}%</p>
      <p className="mt-1 text-sm font-medium text-slate-600">
        Prontidão documental
      </p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  cor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
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
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function DashboardDocumental({ cnpjFiltro }: { cnpjFiltro?: string }) {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["documentos-empresa-dashboard", cnpjFiltro],
    queryFn: async () => {
      const params = cnpjFiltro ? `?cnpj=${encodeURIComponent(cnpjFiltro)}` : "";
      const r = await fetch(`/api/documentos-empresa/dashboard${params}`);
      if (!r.ok) throw new Error("Erro ao carregar dashboard");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score + Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="sm:col-span-1">
          <ScoreCircle score={data.scoreProntidao} />
        </div>
        <div className="sm:col-span-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            icon={Shield}
            label="Total documentos"
            value={data.totalDocumentos}
            cor="#3B82F6"
          />
          <MetricCard
            icon={FileCheck}
            label="Vigentes"
            value={data.porStatus.vigente}
            cor="#10B981"
          />
          <MetricCard
            icon={AlertTriangle}
            label="A vencer"
            value={data.porStatus.vencendo}
            cor="#F59E0B"
          />
          <MetricCard
            icon={XCircle}
            label="Vencidos"
            value={data.porStatus.vencido}
            cor="#EF4444"
          />
        </div>
      </div>

      {/* Por categoria */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Status por categoria de habilitação
        </h3>
        <div className="space-y-3">
          {data.porCategoria
            .filter((c) => c.total > 0)
            .map((cat) => (
              <div key={cat.categoria} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-slate-700 text-right shrink-0">
                  {CATEGORIA_LABELS[cat.categoria] ?? cat.categoria}
                </span>
                <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-slate-100">
                  {cat.vigentes > 0 && (
                    <div
                      className="bg-emerald-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(cat.vigentes / cat.total) * 100}%` }}
                    >
                      {cat.vigentes}
                    </div>
                  )}
                  {cat.vencendo > 0 && (
                    <div
                      className="bg-amber-400 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(cat.vencendo / cat.total) * 100}%` }}
                    >
                      {cat.vencendo}
                    </div>
                  )}
                  {cat.vencidos > 0 && (
                    <div
                      className="bg-red-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(cat.vencidos / cat.total) * 100}%` }}
                    >
                      {cat.vencidos}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Ações pendentes */}
      {data.acoesPendentes.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-red-900 mb-3">
            Ações pendentes
          </h3>
          <div className="space-y-2">
            {data.acoesPendentes.map((acao) => (
              <div
                key={acao.id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <AlertaBadge nivel={acao.nivelAlerta} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {acao.tipoDocumento}
                    </p>
                    <p className="text-xs text-slate-500">CNPJ: {acao.cnpj}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {acao.diasRestantes !== null && acao.diasRestantes <= 0
                      ? `Vencido há ${Math.abs(acao.diasRestantes)} dia(s)`
                      : `Vence em ${acao.diasRestantes} dia(s)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Vencimentos nos próximos 90 dias
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4">Documento</th>
                  <th className="pb-2 pr-4">CNPJ</th>
                  <th className="pb-2 pr-4">Vencimento</th>
                  <th className="pb-2 pr-4">Dias</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.timeline.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">
                      {doc.tipoDocumento}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{doc.cnpj}</td>
                    <td className="py-2 pr-4 text-slate-500">
                      {doc.dataValidade
                        ? new Date(doc.dataValidade).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 font-bold text-slate-900">
                      {doc.diasRestantes}
                    </td>
                    <td className="py-2">
                      <AlertaBadge nivel={doc.nivelAlerta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
