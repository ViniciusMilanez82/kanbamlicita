import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { LicitacaoHeader } from '@/components/licitacao/LicitacaoHeader'
import { DetailTabs } from '@/components/licitacao/DetailTabs'
import { ResumoTab } from '@/components/licitacao/tabs/ResumoTab'
import { DocumentosTab } from '@/components/licitacao/tabs/DocumentosTab'
import { ItensTab } from '@/components/licitacao/tabs/ItensTab'
import { AnaliseForm } from '@/components/licitacao/tabs/AnaliseForm'
import { HistoricoTab } from '@/components/licitacao/tabs/HistoricoTab'
import { db } from '@/lib/db'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

const VALID_TABS = ['resumo', 'documentos', 'itens', 'analise', 'historico', 'ia', 'score', 'parecer'] as const
type Tab = typeof VALID_TABS[number]

async function getLicitacao(id: string): Promise<LicitacaoDetalhe> {
  const row = await db.licitacao.findUnique({
    where: { id },
    include: {
      card: true,
      movimentacoes: { orderBy: { criadoEm: 'desc' } },
      score: true,
      documentos: true,
      itens: { orderBy: { criadoEm: 'asc' } },
      analise: true,
    },
  })

  if (!row) notFound()

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
    documentos: row.documentos
      ? {
          possuiEdital: row.documentos.possuiEdital,
          possuiTermoReferencia: row.documentos.possuiTermoReferencia,
          possuiProjetoBasico: row.documentos.possuiProjetoBasico,
          possuiMemorialDescritivo: row.documentos.possuiMemorialDescritivo,
          possuiAnexosTecnicos: row.documentos.possuiAnexosTecnicos,
          possuiPlanilhaOrcamentaria: row.documentos.possuiPlanilhaOrcamentaria,
          possuiCronograma: row.documentos.possuiCronograma,
          possuiMinutaContratual: row.documentos.possuiMinutaContratual,
          lacunasDocumentais: row.documentos.lacunasDocumentais,
        }
      : null,
    itens: row.itens.map((item) => ({
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
          aderenciaDiretaExiste: row.analise.aderenciaDiretaExiste,
          aderenciaDiretaNivel: row.analise.aderenciaDiretaNivel,
          aderenciaAplicacaoExiste: row.analise.aderenciaAplicacaoExiste,
          aderenciaAplicacaoNivel: row.analise.aderenciaAplicacaoNivel,
          contextoOcultoExiste: row.analise.contextoOcultoExiste,
          contextoOcultoNivel: row.analise.contextoOcultoNivel,
          oportunidadeOcultaExiste: row.analise.oportunidadeOcultaExiste,
          oportunidadeOcultaForca: row.analise.oportunidadeOcultaForca,
          oportunidadeOcultaResumo: row.analise.oportunidadeOcultaResumo,
          oportunidadeNoObjeto: row.analise.oportunidadeNoObjeto,
          oportunidadeNoTr: row.analise.oportunidadeNoTr,
          oportunidadeNosLotes: row.analise.oportunidadeNosLotes,
          oportunidadeNosItens: row.analise.oportunidadeNosItens,
          oportunidadeNaPlanilha: row.analise.oportunidadeNaPlanilha,
          oportunidadeNoMemorial: row.analise.oportunidadeNoMemorial,
          oportunidadeEmAnexoTecnico: row.analise.oportunidadeEmAnexoTecnico,
          portfolioAplicavel: row.analise.portfolioAplicavel as unknown[],
          solucoesMuliteinerAplicaveis: row.analise.solucoesMuliteinerAplicaveis as unknown[],
        }
      : null,
    movimentacoes: row.movimentacoes.map((m) => ({
      id: m.id,
      colunaOrigem: m.colunaOrigem ?? null,
      colunaDestino: m.colunaDestino,
      motivo: m.motivo,
      automatico: m.automatico,
      criadoEm: m.criadoEm.toISOString(),
    })),
  }
}

function PlaceholderTab({ feature }: { feature: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
      <div className="text-4xl">🔧</div>
      <p className="text-sm font-medium text-slate-700">Disponível no {feature}</p>
      <p className="text-xs text-slate-400">Este módulo será implementado em uma próxima etapa.</p>
    </div>
  )
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LicitacaoDetalhePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: Tab = (VALID_TABS.includes(tab as Tab) ? tab : 'resumo') as Tab

  const licitacao = await getLicitacao(id)

  return (
    <>
      <TopBar title="Detalhe da Licitação" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <LicitacaoHeader licitacao={licitacao} />
        <DetailTabs id={id} activeTab={activeTab} />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'resumo' && <ResumoTab licitacao={licitacao} />}
          {activeTab === 'documentos' && <DocumentosTab documentos={licitacao.documentos} />}
          {activeTab === 'itens' && <ItensTab itens={licitacao.itens} />}
          {activeTab === 'analise' && (
            <AnaliseForm licitacaoId={id} analise={licitacao.analise} />
          )}
          {activeTab === 'historico' && (
            <HistoricoTab movimentacoes={licitacao.movimentacoes} />
          )}
          {activeTab === 'ia' && <PlaceholderTab feature="SP-4" />}
          {activeTab === 'score' && <PlaceholderTab feature="SP-5" />}
          {activeTab === 'parecer' && <PlaceholderTab feature="SP-5" />}
        </div>
      </div>
    </>
  )
}
