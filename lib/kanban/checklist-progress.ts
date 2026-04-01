export type ChecklistProgressoArmazenado = Record<
  string,
  Record<string, boolean>
>;

function asProgress(raw: unknown): ChecklistProgressoArmazenado {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: ChecklistProgressoArmazenado = {};
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner: Record<string, boolean> = {};
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        inner[ik] = Boolean(iv);
      }
      out[k] = inner;
    }
  }
  return out;
}

/** Percentual de itens marcados para uma coluna */
export function checklistPercentual(
  colunaNome: string,
  totalItens: number,
  raw: unknown
): number {
  if (totalItens <= 0) return 0;
  const progress = asProgress(raw);
  const col = progress[colunaNome];
  if (!col) return 0;
  const done = Object.values(col).filter(Boolean).length;
  return Math.round((done / totalItens) * 100);
}

/** Resumo para exibição: "3/5 concluídos" */
export function checklistResumo(
  colunaNome: string,
  totalItens: number,
  raw: unknown
): { done: number; total: number; percent: number } {
  const progress = asProgress(raw);
  const col = progress[colunaNome];
  const done = col ? Object.values(col).filter(Boolean).length : 0;
  return {
    done,
    total: totalItens,
    percent: totalItens > 0 ? Math.round((done / totalItens) * 100) : 0,
  };
}
