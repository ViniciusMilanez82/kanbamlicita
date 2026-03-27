import { TopBar } from '@/components/layout/TopBar'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { db } from '@/lib/db'
import type { LicitacaoComCard } from '@/types/licitacao'

async function getLicitacoes(): Promise<LicitacaoComCard[]> {
  const rows = await db.licitacao.findMany({
    include: {
      card: {
        select: {
          id: true,
          colunaAtual: true,
          urgente: true,
          bloqueado: true,
          motivoBloqueio: true,
          responsavel: { select: { id: true, name: true } },
        },
      },
      score: {
        select: {
          scoreFinal: true,
          faixaClassificacao: true,
          valorCapturavelEstimado: true,
          falsoNegativoNivelRisco: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })

  return rows
    .filter((r) => r.card !== null)
    .map((r) => ({
      ...r,
      dataSessao: r.dataSessao?.toISOString() ?? null,
      valorGlobalEstimado: r.valorGlobalEstimado ? Number(r.valorGlobalEstimado) : null,
      card: r.card!,
      score: r.score
        ? {
            ...r.score,
            scoreFinal: Number(r.score.scoreFinal),
            valorCapturavelEstimado: r.score.valorCapturavelEstimado
              ? Number(r.score.valorCapturavelEstimado)
              : null,
          }
        : null,
    }))
}

export default async function KanbanPage() {
  const licitacoes = await getLicitacoes()

  return (
    <>
      <TopBar title="Kanban de Licitações" />
      <KanbanBoard initialData={licitacoes} />
    </>
  )
}
