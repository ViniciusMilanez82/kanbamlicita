"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

interface BlocoOQueFazerProps {
  cardId: string;
  colunaNome: string;
  corEtapa: string;
  papelResponsavel: string | null;
  responsavelNome: string | null;
  itens: string[];
  checklistProgresso: Record<string, Record<string, boolean>> | null;
  itensAutomaticos?: Record<number, boolean>;
}

export function BlocoOQueFazer({
  cardId,
  colunaNome,
  corEtapa,
  papelResponsavel,
  responsavelNome,
  itens,
  checklistProgresso,
  itensAutomaticos = {},
}: BlocoOQueFazerProps) {
  const progressoColuna = checklistProgresso?.[colunaNome] ?? {};

  const [estados, setEstados] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    itens.forEach((_, idx) => {
      if (itensAutomaticos[idx] !== undefined) {
        init[String(idx)] = itensAutomaticos[idx];
      } else {
        init[String(idx)] = progressoColuna[String(idx)] ?? false;
      }
    });
    return init;
  });

  const salvarMutation = useMutation({
    mutationFn: async (novosEstados: Record<string, boolean>) => {
      const novoProgresso = {
        ...(checklistProgresso ?? {}),
        [colunaNome]: novosEstados,
      };
      const r = await fetch(`/api/kanban/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistProgresso: novoProgresso }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
  });

  const toggleItem = useCallback(
    (idx: number) => {
      if (itensAutomaticos[idx] !== undefined) return;
      const key = String(idx);
      const novos = { ...estados, [key]: !estados[key] };
      setEstados(novos);
      salvarMutation.mutate(novos);
    },
    [estados, itensAutomaticos, salvarMutation]
  );

  const total = itens.length;
  const feitos = Object.values(estados).filter(Boolean).length;
  const percentual = total > 0 ? Math.round((feitos / total) * 100) : 0;

  if (itens.length === 0) return null;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: `${corEtapa}10`,
        borderLeft: `3px solid ${corEtapa}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: corEtapa }}
          >
            {colunaNome}
          </span>
          {papelResponsavel && (
            <span className="text-[10px] text-slate-500">{papelResponsavel}</span>
          )}
        </div>
        <span className="text-xs text-slate-500">{feitos}/{total}</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-200 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentual}%`, backgroundColor: corEtapa }}
        />
      </div>

      {responsavelNome && (
        <div className="text-[11px] text-slate-500 mb-2">
          Responsável: <span className="font-medium text-slate-700">{responsavelNome}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {itens.map((texto, idx) => {
          const marcado = estados[String(idx)] ?? false;
          const isAuto = itensAutomaticos[idx] !== undefined;

          return (
            <button
              key={idx}
              onClick={() => toggleItem(idx)}
              disabled={isAuto || salvarMutation.isPending}
              className={`flex w-full items-start gap-2 text-left text-xs rounded-md px-2 py-1.5 transition-colors
                ${isAuto ? "cursor-default" : "cursor-pointer hover:bg-white/50"}
                ${marcado ? "text-slate-400" : "text-slate-700"}
              `}
            >
              <span className="mt-0.5 shrink-0">
                {marcado ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded border-2 text-[9px] font-bold"
                    style={{ borderColor: corEtapa, color: corEtapa }}
                  >
                    {idx + 1}
                  </span>
                )}
              </span>
              <span className={marcado ? "line-through" : ""}>
                {texto}
                {isAuto && (
                  <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-400 no-underline">
                    auto
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
