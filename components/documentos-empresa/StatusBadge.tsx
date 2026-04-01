"use client";

import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  vigente: { label: "Vigente", bg: "bg-emerald-100", text: "text-emerald-700" },
  vencendo: { label: "Vencendo", bg: "bg-amber-100", text: "text-amber-700" },
  vencido: { label: "Vencido", bg: "bg-red-100", text: "text-red-700" },
  substituido: { label: "Substituído", bg: "bg-slate-100", text: "text-slate-500" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.vigente;

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
