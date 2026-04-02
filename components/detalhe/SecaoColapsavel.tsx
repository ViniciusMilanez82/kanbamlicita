"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SecaoColapsavelProps {
  titulo: string;
  children: React.ReactNode;
  defaultAberto?: boolean;
  icone?: React.ReactNode;
}

export function SecaoColapsavel({
  titulo,
  children,
  defaultAberto = false,
  icone,
}: SecaoColapsavelProps) {
  const [aberto, setAberto] = useState(defaultAberto);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-2 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        {aberto ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {icone}
        {titulo}
      </button>
      {aberto && <div className="pb-3 pl-6">{children}</div>}
    </div>
  );
}
