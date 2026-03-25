import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLlmProvider } from '@/lib/llm/factory'
import { SYSTEM_PROMPT, buildUserPrompt, type AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'
import type { LlmProvider } from '@/lib/llm/provider'
import type { LicitacaoItemModel } from '@/lib/generated/prisma/models/LicitacaoItem'
import type { KanbanMovimentacaoModel } from '@/lib/generated/prisma/models/KanbanMovimentacao'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const analise = await db.licitacaoAnaliseIa.findFirst({
    where: { licitacaoId: id },
    orderBy: { criadoEm: 'desc' },
  })
  return NextResponse.json({ analise })
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const licitacao = await db.licitacao.findUnique({ where: { id } })
  if (!licitacao) {
    return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
  }

  const emProcessamento = await db.licitacaoAnaliseIa.findFirst({
    where: { licitacaoId: id, status: 'EM_PROCESSAMENTO' },
  })
  if (emProcessamento) {
    return NextResponse.json({ error: 'Análise já em andamento' }, { status: 409 })
  }

  const registro = await db.licitacaoAnaliseIa.create({
    data: {
      licitacaoId: id,
      tipoAnalise: 'analise_completa',
      status: 'EM_PROCESSAMENTO',
      promptVersao: 'v1',
    },
  })

  // Fire-and-forget — seguro em Node.js/pm2 (não serverless)
  void processAnalise(registro.id, id)

  return NextResponse.json({ status: 'EM_PROCESSAMENTO', id: registro.id }, { status: 202 })
}

export async function processAnalise(
  registroId: string,
  licitacaoId: string,
  provider?: LlmProvider
) {
  try {
    const row = await db.licitacao.findUniqueOrThrow({
      where: { id: licitacaoId },
      include: {
        card: true,
        itens: { orderBy: { criadoEm: 'asc' } },
        analise: true,
        documentos: true,
        score: true,
        movimentacoes: { orderBy: { criadoEm: 'desc' } },
      },
    })

    const licitacaoDetalhe = serializeForPrompt(row)
    const llm = provider ?? getLlmProvider()
    const userPrompt = buildUserPrompt(licitacaoDetalhe)
    const raw = await llm.complete(SYSTEM_PROMPT, userPrompt)

    // Remover possíveis blocos markdown do LLM
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const result: AnaliseIaResult = JSON.parse(cleaned)

    await db.licitacaoAnaliseIa.update({
      where: { id: registroId },
      data: {
        status: 'CONCLUIDO',
        modeloUtilizado: llm.modelName,
        resultadoJson: result,
        resumoTexto: result.resumo,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    await db.licitacaoAnaliseIa
      .update({ where: { id: registroId }, data: { status: 'ERRO', resumoTexto: msg } })
      .catch(() => {})
  }
}

type LicitacaoWithRelations = Awaited<ReturnType<typeof db.licitacao.findUniqueOrThrow>> & {
  card: Awaited<ReturnType<typeof db.kanbanCard.findFirst>>
  itens: LicitacaoItemModel[]
  analise: Awaited<ReturnType<typeof db.licitacaoAnalise.findFirst>>
  documentos: Awaited<ReturnType<typeof db.licitacaoDocumento.findFirst>>
  score: Awaited<ReturnType<typeof db.licitacaoScore.findFirst>>
  movimentacoes: KanbanMovimentacaoModel[]
}

function serializeForPrompt(row: LicitacaoWithRelations): LicitacaoDetalhe {
  return {
    ...row,
    dataPublicacao: row.dataPublicacao?.toISOString() ?? null,
    dataSessao: row.dataSessao?.toISOString() ?? null,
    valorGlobalEstimado: row.valorGlobalEstimado ? Number(row.valorGlobalEstimado) : null,
    card: row.card
      ? {
          id: row.card.id,
          colunaAtual: row.card.colunaAtual,
          urgente: row.card.urgente,
          bloqueado: row.card.bloqueado,
          motivoBloqueio: row.card.motivoBloqueio ?? null,
        }
      : null,
    score: row.score
      ? {
          scoreFinal: Number(row.score.scoreFinal),
          faixaClassificacao: row.score.faixaClassificacao,
          valorCapturavelEstimado: row.score.valorCapturavelEstimado
            ? Number(row.score.valorCapturavelEstimado)
            : null,
          falsoNegativoNivelRisco: row.score.falsoNegativoNivelRisco,
        }
      : null,
    documentos: row.documentos ?? null,
    itens: row.itens.map((item: LicitacaoItemModel) => ({
      id: item.id,
      tipo: item.tipo,
      identificador: item.identificador,
      descricao: item.descricao,
      quantitativo: item.quantitativo ? Number(item.quantitativo) : null,
      unidade: item.unidade,
      aderencia: item.aderencia,
      prioridade: item.prioridade,
      valorEstimadoItem: item.valorEstimadoItem ? Number(item.valorEstimadoItem) : null,
      observacoes: item.observacoes,
    })),
    analise: row.analise
      ? {
          ...row.analise,
          portfolioAplicavel: (row.analise.portfolioAplicavel as unknown[]) ?? [],
          solucoesMuliteinerAplicaveis: (row.analise.solucoesMuliteinerAplicaveis as unknown[]) ?? [],
        }
      : null,
    movimentacoes: row.movimentacoes.map((m: KanbanMovimentacaoModel) => ({
      id: m.id,
      colunaOrigem: m.colunaOrigem ?? null,
      colunaDestino: m.colunaDestino,
      motivo: m.motivo,
      automatico: m.automatico,
      criadoEm: m.criadoEm.toISOString(),
    })),
    analiseIa: null, // não necessário para o prompt
  }
}
