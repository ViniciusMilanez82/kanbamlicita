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
        parecer: true,
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
  parecer: Awaited<ReturnType<typeof db.licitacaoParece.findFirst>>
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
          scoreAderenciaDireta: Number(row.score.scoreAderenciaDireta),
          scoreAderenciaAplicacao: Number(row.score.scoreAderenciaAplicacao),
          scoreContextoOculto: Number(row.score.scoreContextoOculto),
          scoreModeloComercial: Number(row.score.scoreModeloComercial),
          scorePotencialEconomico: Number(row.score.scorePotencialEconomico),
          scoreQualidadeEvidencia: Number(row.score.scoreQualidadeEvidencia),
          scoreJustificativaResumida: row.score.scoreJustificativaResumida,
          valorCapturavelObrigatorioPreenchido: row.score.valorCapturavelObrigatorioPreenchido,
          valorCapturavelFoiPossivelEstimar: row.score.valorCapturavelFoiPossivelEstimar,
          valorCapturavelEstimado: row.score.valorCapturavelEstimado
            ? Number(row.score.valorCapturavelEstimado)
            : null,
          valorCapturavelFaixaMin: row.score.valorCapturavelFaixaMin
            ? Number(row.score.valorCapturavelFaixaMin)
            : null,
          valorCapturavelFaixaMax: row.score.valorCapturavelFaixaMax
            ? Number(row.score.valorCapturavelFaixaMax)
            : null,
          valorCapturavelMoeda: row.score.valorCapturavelMoeda,
          valorCapturavelNivelConfianca: row.score.valorCapturavelNivelConfianca,
          valorCapturavelMetodoEstimativa: row.score.valorCapturavelMetodoEstimativa,
          valorCapturavelJustificativa: row.score.valorCapturavelJustificativa,
          valorCapturavelBaseDocumental: row.score.valorCapturavelBaseDocumental as unknown[],
          valorCapturavelObservacao: row.score.valorCapturavelObservacao,
          falsoNegativoObrigatorioPreenchido: row.score.falsoNegativoObrigatorioPreenchido,
          falsoNegativoExisteRisco: row.score.falsoNegativoExisteRisco,
          falsoNegativoNivelRisco: row.score.falsoNegativoNivelRisco,
          falsoNegativoMotivos: row.score.falsoNegativoMotivos as unknown[],
          falsoNegativoTrechosCriticos: row.score.falsoNegativoTrechosCriticos as unknown[],
          falsoNegativoResumo: row.score.falsoNegativoResumo,
        }
      : null,
    parecer: row.parecer
      ? {
          classificacaoFinal: row.parecer.classificacaoFinal,
          prioridadeComercial: row.parecer.prioridadeComercial,
          valeEsforcoComercial: row.parecer.valeEsforcoComercial,
          recomendacaoFinal: row.parecer.recomendacaoFinal,
          resumo: row.parecer.resumo,
          oportunidadeDireta: row.parecer.oportunidadeDireta,
          oportunidadeIndireta: row.parecer.oportunidadeIndireta,
          oportunidadeOcultaItemLoteAnexo: row.parecer.oportunidadeOcultaItemLoteAnexo,
          oportunidadeInexistente: row.parecer.oportunidadeInexistente,
          riscoFalsoPositivo: row.parecer.riscoFalsoPositivo,
          riscoFalsoNegativoSoTitulo: row.parecer.riscoFalsoNegativoSoTitulo,
          ondeEstaOportunidade: row.parecer.ondeEstaOportunidade as string[],
          solucoesQueMultiteinerPoderiaOfertar: row.parecer.solucoesQueMultiteinerPoderiaOfertar as string[],
          proximoPasosRecomendado: row.parecer.proximoPasosRecomendado as string[],
          riscosLimitacoes: row.parecer.riscosLimitacoes as string[],
          evidenciasPrincipais: row.parecer.evidenciasPrincipais as string[],
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
      tipoAderencia: item.tipoAderencia ?? null,
      prioridade: item.prioridade,
      valorEstimadoItem: item.valorEstimadoItem ? Number(item.valorEstimadoItem) : null,
      motivo: item.motivo ?? null,
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
    sinais: [], // não necessário para o prompt
  }
}
