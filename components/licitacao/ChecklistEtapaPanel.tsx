"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Loader2 } from "lucide-react";

type Props = {
  cardId: string;
  colunaNome: string;
  itens: string[];
  checklistProgressoInicial: unknown;
};

function getProgressoBooleans(
  raw: unknown,
  coluna: string,
  total: number
): boolean[] {
  if (!raw || typeof raw !== "object") return new Array(total).fill(false);
  const o = raw as Record<string, unknown>;
  const col = o[coluna];
  if (!col || typeof col !== "object") return new Array(total).fill(false);
  const c = col as Record<string, boolean>;
  return Array.from({ length: total }, (_, i) => Boolean(c[String(i)]));
}

function mergeProgressoColuna(
  raw: unknown,
  coluna: string,
  booleans: boolean[]
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object"
      ? { ...(raw as Record<string, unknown>) }
      : {};
  const col: Record<string, boolean> = {};
  booleans.forEach((v, i) => {
    col[String(i)] = v;
  });
  base[coluna] = col;
  return base;
}

export function ChecklistEtapaPanel({
  cardId,
  colunaNome,
  itens,
  checklistProgressoInicial,
}: Props) {
  const router = useRouter();
  const [done, setDone] = useState<boolean[]>(() =>
    getProgressoBooleans(checklistProgressoInicial, colunaNome, itens.length)
  );
  const [raw, setRaw] = useState(checklistProgressoInicial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDone(
      getProgressoBooleans(checklistProgressoInicial, colunaNome, itens.length)
    );
    setRaw(checklistProgressoInicial);
  }, [checklistProgressoInicial, colunaNome, itens.length]);

  if (itens.length === 0) return null;

  const concluidos = done.filter(Boolean).length;

  async function toggle(i: number) {
    if (saving) return;
    const next = [...done];
    next[i] = !next[i];
    setDone(next);
    const merged = mergeProgressoColuna(raw, colunaNome, next);
    setRaw(merged);
    setSaving(true);
    try {
      const res = await fetch(`/api/kanban/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistProgresso: merged }),
      });
      if (!res.ok) {
        setDone(
          getProgressoBooleans(raw, colunaNome, itens.length)
        );
        return;
      }
      router.refresh();
    } catch {
      setDone(
        getProgressoBooleans(raw, colunaNome, itens.length)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <ListChecks className="h-4 w-4 text-slate-500" aria-hidden />
          Checklist — {colunaNome}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {saving && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-blue-600"
              aria-hidden
            />
          )}
          <span>
            {concluidos}/{itens.length} concluídos
          </span>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Itens definidos em Configurações. O progresso fica salvo neste card.
      </p>
      <ul className="mt-3 space-y-2">
        {itens.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-slate-800"
          >
            <input
              type="checkbox"
              checked={done[i] ?? false}
              onChange={() => void toggle(i)}
              disabled={saving}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <span
              className={`leading-snug ${done[i] ? "text-slate-500 line-through" : ""}`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
