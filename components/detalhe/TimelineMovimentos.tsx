"use client";

import { formatDateTime } from "@/lib/format";
import type { Movimentacao } from "@/types/licitacao";

export function TimelineMovimentos({ movimentacoes }: { movimentacoes: Movimentacao[] }) {
  if (movimentacoes.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma movimentação registrada.</p>;
  }

  return (
    <div className="space-y-2">
      {movimentacoes.map((m) => (
        <div key={m.id} className="flex gap-3 border-l-2 border-slate-200 pl-3 py-1">
          <div>
            <p className="text-xs text-slate-500">{formatDateTime(m.criadoEm)}</p>
            <p className="text-sm">
              {m.colunaOrigem && <span className="text-slate-400">{m.colunaOrigem} → </span>}
              <span className="font-medium">{m.colunaDestino}</span>
            </p>
            {m.motivo && <p className="text-xs text-slate-500 italic">{m.motivo}</p>}
            {m.movidoPor && <p className="text-xs text-slate-400">por {m.movidoPor}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
