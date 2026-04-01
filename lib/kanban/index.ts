import { db } from "@/lib/db";

export type KanbanColuna = {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: string;
  ativo: boolean;
};

/**
 * Busca as colunas do Kanban do banco e retorna um mapa de labels por id.
 */
export async function getKanbanColunaLabels(): Promise<Record<string, string>> {
  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  const labels: Record<string, string> = {};
  for (const c of colunas) {
    labels[c.id] = c.nome;
  }
  return labels;
}

/**
 * IDs de colunas por tipo — útil para queries.
 */
export async function getColunasPorTipo(): Promise<
  Record<string, { id: string; nome: string }[]>
> {
  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  const mapa: Record<string, { id: string; nome: string }[]> = {};
  for (const c of colunas) {
    if (!mapa[c.tipo]) mapa[c.tipo] = [];
    mapa[c.tipo].push({ id: c.id, nome: c.nome });
  }
  return mapa;
}
