"use client";

import { cn } from "@/lib/utils";

const NIVEL_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  verde: { label: "OK", bg: "bg-emerald-100", text: "text-emerald-700" },
  amarelo: { label: "Atenção", bg: "bg-yellow-100", text: "text-yellow-700" },
  laranja: { label: "Urgente", bg: "bg-orange-100", text: "text-orange-700" },
  vermelho: { label: "Crítico", bg: "bg-red-100", text: "text-red-700" },
  preto: { label: "VENCIDO", bg: "bg-slate-800", text: "text-white" },
};

export function AlertaBadge({
  nivel,
  className,
}: {
  nivel: string | null;
  className?: string;
}) {
  if (!nivel) return null;
  const config = NIVEL_CONFIG[nivel];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}
