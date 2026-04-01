"use client";

import type { KanbanMetricas } from "@/lib/kanban/metricas-query";
import { BarChart3, Clock, AlertTriangle, Users } from "lucide-react";

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function MetricsCardsRow({ metricas }: { metricas: KanbanMetricas }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
      <MetricCard
        label="Total no pipeline"
        value={metricas.total}
        icon={BarChart3}
        color="#3B82F6"
      />
      <MetricCard
        label="Captadas hoje"
        value={metricas.captadasHoje}
        icon={Clock}
        color="#10B981"
      />
      <MetricCard
        label="Urgentes"
        value={metricas.urgentes}
        icon={AlertTriangle}
        color="#EF4444"
      />
      <MetricCard
        label="Sem responsável"
        value={metricas.semResponsavel}
        icon={Users}
        color="#F59E0B"
      />
    </div>
  );
}
