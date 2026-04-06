"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Trophy, Target, DollarSign, Download, BarChart3, MapPin } from "lucide-react";
import { toast } from "sonner";

// ---------- Types ----------
type Resumo = {
  totalLicitacoes: number;
  ganhas: number;
  perdidas: number;
  desistidas: number;
  winRate: number;
  valorTotalGanho: number;
  valorTotalPerdido: number;
  ticketMedioNosso: number;
  ticketMedioVencedor: number;
  diferencaMediaPercentual: number;
};

type TendenciaMes = {
  mes: string;
  ganhas: number;
  perdidas: number;
  winRate: number;
  valorMedio: number;
};

type MotivoDerrota = {
  motivo: string;
  count: number;
  percentual: number;
  valorMedioPerdido: number;
};

type Concorrente = {
  id: string | null;
  nome: string;
  vezesVenceu: number;
  valorMedioVencedor: number;
  motivoMaisComum: string | null;
};

type UfData = {
  uf: string;
  total: number;
  ganhas: number;
  winRate: number;
};

type ModalidadeData = {
  modalidade: string;
  total: number;
  ganhas: number;
  winRate: number;
};

type CompetitivoData = {
  resumo: Resumo;
  tendenciaMensal: TendenciaMes[];
  porUf: UfData[];
  porModalidade: ModalidadeData[];
  rankingConcorrentes: Concorrente[];
  analiseDerrota: MotivoDerrota[];
  porCriterio: { criterio: string; total: number; ganhas: number; winRate: number }[];
};

// ---------- Helpers ----------

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function mesLabel(mes: string): string {
  const [ano, m] = mes.split("-");
  const nomes = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${nomes[parseInt(m, 10) - 1]}/${ano.slice(2)}`;
}

const MOTIVO_COR: Record<string, string> = {
  Preco: "#3B82F6",
  Tecnica: "#8B5CF6",
  Habilitacao: "#F59E0B",
  Prazo: "#EF4444",
  Desistencia: "#6B7280",
  "Nao informado": "#94A3B8",
};

function corMotivo(motivo: string): string {
  return MOTIVO_COR[motivo] ?? "#6B7280";
}

// ---------- Sub-components ----------

function KpiCard({
  label,
  valor,
  icon: Icon,
  cor,
  destaque,
}: {
  label: string;
  valor: string | number;
  icon: React.ElementType;
  cor: string;
  destaque?: "positivo" | "negativo" | "neutro";
}) {
  const textColor =
    destaque === "positivo"
      ? "text-emerald-600"
      : destaque === "negativo"
        ? "text-rose-600"
        : "text-slate-900";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: cor + "18" }}
      >
        <Icon className="h-5 w-5" style={{ color: cor }} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold ${textColor}`}>{valor}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function BarraHorizontal({
  percentual,
  cor,
  label,
  sublabel,
}: {
  percentual: number;
  cor: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-xs font-medium text-slate-700">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
          <div
            className="flex h-full items-center rounded-md px-2 text-xs font-bold text-white transition-all"
            style={{
              width: `${Math.max(percentual, percentual > 0 ? 6 : 0)}%`,
              backgroundColor: cor,
            }}
          >
            {percentual >= 10 && `${Math.round(percentual)}%`}
          </div>
        </div>
        {percentual < 10 && percentual > 0 && (
          <span className="text-xs font-medium text-slate-500">
            {Math.round(percentual)}%
          </span>
        )}
        {sublabel && (
          <span className="text-[10px] text-slate-400">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export function InteligenciaClient() {
  const [periodo, setPeriodo] = useState("todos");
  const [uf, setUf] = useState("");
  const [segmento, setSegmento] = useState("");

  const queryParams = new URLSearchParams();
  if (periodo !== "todos") queryParams.set("periodo", periodo);
  if (uf) queryParams.set("uf", uf);
  if (segmento) queryParams.set("segmento", segmento);
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["inteligencia-competitiva", periodo, uf, segmento],
    queryFn: async () => {
      const url = `/api/relatorios/competitivo${qs ? `?${qs}` : ""}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Erro ao carregar dados");
      return r.json() as Promise<CompetitivoData>;
    },
  });

  function handleExportarCsv() {
    toast.info("Preparando arquivo...");
    window.open("/api/relatorios/competitivo/exportar", "_blank");
  }

  // Collect UFs and modalidades from data for filter dropdowns
  const ufsDisponiveis = data
    ? [...new Set(data.porUf.map((u) => u.uf))].filter((u) => u !== "N/A").sort()
    : [];
  const modalidadesDisponiveis = data
    ? [...new Set(data.porModalidade.map((m) => m.modalidade))]
        .filter((m) => m !== "Nao informada")
        .sort()
    : [];

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Carregando dados...</p>
      </div>
    );
  }

  const { resumo } = data;

  // Empty state
  if (resumo.totalLicitacoes === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">
          Nenhum resultado registrado ainda
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Quando voce mover licitacoes para &quot;Ganhamos&quot; ou
          &quot;Perdemos&quot;, os dados aparecerao aqui.
        </p>
      </div>
    );
  }

  const maxMensal = Math.max(
    ...data.tendenciaMensal.map((m) => m.ganhas + m.perdidas),
    1,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v ?? "todos")}>
          <SelectTrigger>
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo periodo</SelectItem>
            <SelectItem value="3m">Ultimos 3 meses</SelectItem>
            <SelectItem value="6m">Ultimos 6 meses</SelectItem>
            <SelectItem value="12m">Ultimo ano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={uf} onValueChange={(v) => setUf(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as UFs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as UFs</SelectItem>
            {ufsDisponiveis.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={segmento} onValueChange={(v) => setSegmento(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as modalidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as modalidades</SelectItem>
            {modalidadesDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button onClick={handleExportarCsv} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Taxa de vitoria"
          valor={`${resumo.winRate}%`}
          icon={Trophy}
          cor={resumo.winRate >= 50 ? "#059669" : "#EF4444"}
          destaque={resumo.winRate >= 50 ? "positivo" : "negativo"}
        />
        <KpiCard
          label="Licitacoes ganhas / total"
          valor={`${resumo.ganhas} de ${resumo.ganhas + resumo.perdidas}`}
          icon={Target}
          cor="#3B82F6"
        />
        <KpiCard
          label="Valor conquistado"
          valor={formatarMoeda(resumo.valorTotalGanho)}
          icon={DollarSign}
          cor="#059669"
        />
        <KpiCard
          label="Diferenca media de preco"
          valor={`${resumo.diferencaMediaPercentual > 0 ? "+" : ""}${resumo.diferencaMediaPercentual}%`}
          icon={resumo.diferencaMediaPercentual <= 0 ? TrendingDown : TrendingUp}
          cor={resumo.diferencaMediaPercentual <= 0 ? "#059669" : "#EF4444"}
          destaque={resumo.diferencaMediaPercentual <= 0 ? "positivo" : "negativo"}
        />
      </div>

      {/* Row 2: Charts side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tendencia mensal */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Tendencia mensal
            </h3>
          </div>
          <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
            {data.tendenciaMensal.map((m) => {
              const total = m.ganhas + m.perdidas;
              const alturaMax = 140;
              const alturaGanhas = total > 0 ? (m.ganhas / maxMensal) * alturaMax : 0;
              const alturaPerdidas = total > 0 ? (m.perdidas / maxMensal) * alturaMax : 0;
              return (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 40 }}>
                  {total > 0 && (
                    <span className="text-[10px] font-medium text-slate-500">
                      {Math.round(m.winRate)}%
                    </span>
                  )}
                  <div className="flex w-full flex-col items-center">
                    {m.perdidas > 0 && (
                      <div
                        className="w-5 rounded-t bg-rose-400"
                        style={{ height: Math.max(alturaPerdidas, 2) }}
                        title={`Perdidas: ${m.perdidas}`}
                      />
                    )}
                    {m.ganhas > 0 && (
                      <div
                        className={`w-5 bg-emerald-500 ${m.perdidas === 0 ? "rounded-t" : ""} rounded-b`}
                        style={{ height: Math.max(alturaGanhas, 2) }}
                        title={`Ganhas: ${m.ganhas}`}
                      />
                    )}
                    {total === 0 && (
                      <div className="w-5 rounded bg-slate-100" style={{ height: 2 }} />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {mesLabel(m.mes)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ganhas
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" /> Perdidas
            </span>
          </div>
        </div>

        {/* Motivos de derrota */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Motivos de derrota
          </h3>
          {data.analiseDerrota.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhuma derrota registrada.
            </p>
          ) : (
            <div className="space-y-3">
              {data.analiseDerrota.map((d) => (
                <BarraHorizontal
                  key={d.motivo}
                  label={d.motivo}
                  percentual={d.percentual}
                  cor={corMotivo(d.motivo)}
                  sublabel={`${d.count}x`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Tables side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ranking de concorrentes */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Ranking de concorrentes
            </h3>
          </div>
          {data.rankingConcorrentes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Nenhum concorrente registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium text-right">Vitorias</th>
                    <th className="hidden px-4 py-2 font-medium text-right sm:table-cell">
                      Valor medio
                    </th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">
                      Principal motivo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankingConcorrentes.slice(0, 10).map((c, i) => (
                    <tr
                      key={c.id ?? c.nome}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                      <td className="max-w-[180px] truncate px-4 py-2 font-medium text-slate-800">
                        {c.nome}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">
                        {c.vezesVenceu}
                      </td>
                      <td className="hidden px-4 py-2 text-right text-slate-600 sm:table-cell">
                        {c.valorMedioVencedor > 0
                          ? formatarMoeda(c.valorMedioVencedor)
                          : "-"}
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        {c.motivoMaisComum ? (
                          <span
                            className="rounded-md px-2 py-0.5 text-[10px] font-medium text-white"
                            style={{
                              backgroundColor: corMotivo(c.motivoMaisComum),
                            }}
                          >
                            {c.motivoMaisComum}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Desempenho por UF */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <MapPin className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Desempenho por estado
            </h3>
          </div>
          {data.porUf.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Sem dados por estado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">UF</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                    <th className="px-4 py-2 font-medium text-right">Ganhas</th>
                    <th className="px-4 py-2 font-medium">Taxa de vitoria</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porUf.map((u) => (
                    <tr
                      key={u.uf}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {u.uf}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {u.total}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {u.ganhas}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${u.winRate}%`,
                                backgroundColor:
                                  u.winRate >= 50 ? "#059669" : "#F59E0B",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {Math.round(u.winRate)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Desempenho por modalidade */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Desempenho por modalidade
        </h3>
        {data.porModalidade.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Sem dados por modalidade.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.porModalidade.map((m) => (
              <div
                key={m.modalidade}
                className="min-w-[180px] flex-1 rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-xs font-medium text-slate-500">
                  {m.modalidade}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900">
                    {m.ganhas}
                  </span>
                  <span className="text-xs text-slate-400">
                    de {m.total}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${m.winRate}%`,
                        backgroundColor:
                          m.winRate >= 50 ? "#059669" : "#F59E0B",
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {Math.round(m.winRate)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
