import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());

  const [
    totalLicitacoes,
    captadasEsteMes,
    captadasEstaSemana,
    urgentes,
    semResponsavel,
    comScoreAlto,
    valorTotalEstimado,
  ] = await Promise.all([
    db.licitacao.count(),
    db.licitacao.count({ where: { criadoEm: { gte: inicioMes } } }),
    db.licitacao.count({ where: { criadoEm: { gte: inicioSemana } } }),
    db.kanbanCard.count({ where: { urgente: true } }),
    db.kanbanCard.count({ where: { responsavelId: null } }),
    db.licitacao.count({
      where: { classificacaoPreliminar: { in: ["A+", "A"] } },
    }),
    db.licitacao.aggregate({ _sum: { valorEstimado: true } }),
  ]);

  const porColuna = colunas.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    tipo: c.tipo,
    quantidade: c._count.cards,
  }));

  // Classificação distribuição
  const classificacoes = await db.licitacao.groupBy({
    by: ["classificacaoPreliminar"],
    _count: true,
    where: { classificacaoPreliminar: { not: null } },
  });

  return NextResponse.json({
    resumo: {
      totalLicitacoes,
      captadasEsteMes,
      captadasEstaSemana,
      urgentes,
      semResponsavel,
      comScoreAlto,
      valorTotalEstimado: valorTotalEstimado._sum.valorEstimado
        ? Number(valorTotalEstimado._sum.valorEstimado)
        : 0,
    },
    porColuna,
    porClassificacao: classificacoes.map((c) => ({
      classificacao: c.classificacaoPreliminar ?? "Sem classificação",
      quantidade: c._count,
    })),
  });
}
