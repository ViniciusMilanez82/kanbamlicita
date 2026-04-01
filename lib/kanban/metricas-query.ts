import { db } from "@/lib/db";

export type KanbanMetricas = {
  total: number;
  porColuna: { colunaId: string; colunaNome: string; cor: string; count: number }[];
  urgentes: number;
  semResponsavel: number;
  captadasHoje: number;
};

export async function queryKanbanMetricas(): Promise<KanbanMetricas> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  const porColuna = colunas.map((c) => ({
    colunaId: c.id,
    colunaNome: c.nome,
    cor: c.cor,
    count: c._count.cards,
  }));

  const [total, urgentes, semResponsavel, captadasHoje] = await Promise.all([
    db.kanbanCard.count(),
    db.kanbanCard.count({ where: { urgente: true } }),
    db.kanbanCard.count({ where: { responsavelId: null } }),
    db.kanbanCard.count({ where: { criadoEm: { gte: hoje } } }),
  ]);

  return { total, porColuna, urgentes, semResponsavel, captadasHoje };
}
