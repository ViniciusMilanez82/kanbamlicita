"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProximaAcaoResultado } from "@/lib/kanban/next-action";

type Props = {
  acao: ProximaAcaoResultado;
};

const variantClass: Record<ProximaAcaoResultado["variante"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
};

export function ProximaAcaoBanner({ acao }: Props) {
  return (
    <div
      className={cn(
        "mx-6 my-3 flex gap-3 rounded-xl border px-4 py-3",
        variantClass[acao.variante]
      )}
    >
      <Lightbulb
        className="h-5 w-5 shrink-0 mt-0.5 opacity-80"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Próxima ação recomendada
        </p>
        <p className="text-sm font-semibold mt-0.5">{acao.titulo}</p>
        <p className="text-sm opacity-90 mt-1 leading-snug">{acao.descricao}</p>
      </div>
    </div>
  );
}
