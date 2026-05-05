"use client";

import { cn } from "@/lib/utils";

export type AbaConfig = "ia" | "kanban";

const ABAS: { id: AbaConfig; label: string }[] = [
  { id: "ia", label: "Modelo de IA" },
  { id: "kanban", label: "Colunas do Kanban" },
];

export function ConfiguracoesTabs({
  ativa,
  onChange,
}: {
  ativa: AbaConfig;
  onChange: (aba: AbaConfig) => void;
}) {
  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex gap-6">
        {ABAS.map((aba) => {
          const ativo = aba.id === ativa;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => onChange(aba.id)}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                ativo
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {aba.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
