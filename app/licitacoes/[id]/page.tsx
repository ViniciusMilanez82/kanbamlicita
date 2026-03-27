import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { LicitacaoHeader } from '@/components/licitacao/LicitacaoHeader'
import { DetailTabs } from '@/components/licitacao/DetailTabs'
import { ResumoTab } from '@/components/licitacao/tabs/ResumoTab'
import { DocumentosTab } from '@/components/licitacao/tabs/DocumentosTab'
import { ItensTab } from '@/components/licitacao/tabs/ItensTab'
import { AnaliseForm } from '@/components/licitacao/tabs/AnaliseForm'
import { HistoricoTab } from '@/components/licitacao/tabs/HistoricoTab'
import { IaTab } from '@/components/licitacao/tabs/IaTab'
import { ScoreTab } from '@/components/licitacao/tabs/ScoreTab'
import { ParecerTab } from '@/components/licitacao/tabs/ParecerTab'
import { db } from '@/lib/db'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'
import { PESOS_PADRAO, FAIXAS_PADRAO } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'

const VALID_TABS = ['resumo', 'documentos', 'itens', 'analise', 'historico', 'ia', 'sinais', 'score', 'parecer'] as const
type Tab = typeof VALID_TABS[number]

async function getLicitacao(id: string): Promise<{
  licitacao: LicitacaoDetalhe
  configPesos: ConfigPesos
  configFaixas: ConfigFaixas
  listasParecerTab: {
    ondeEstaOportunidade: string[]
    solucoesQueMultiteinerPoderiaOfertar: string[]
    proximoPasosRecomendado: string[]
    riscosLimitacoes: string[]
    evidenciasPrincipais: string[]
  }
}> {
  const row = await db.licitacao.findUnique({
    where: { id },
    include: {
      card: true,
      movimentacoes: { orderBy: { criadoEm: 'desc' } },
      score: true,
      parecer: true,
      documentos: true,
      itens: { orderBy: { criadoEm: 'asc' } },
      analise: true,
      analisesIa: {
        orderBy: { criadoEm: 'desc' },
        take: 1,
      },
      sinais: { orderBy: { criadoEm: 'asc' } },
    },
  })

  if (!row) notFound()

  const config = await db.configuracaoSistema.findUnique({ where: { id: 'default' } })
  const configPesos = (config?.pesosScore ?? PESOS_PADRAO) as ConfigPesos
  const configFaixas = (config?.faixasScore ?? FAIXAS_PADRAO) as ConfigFaixas
  const listasParecerTab = (config?.listasParecerTab ?? {
    ondeEstaOportunidade: [],
    solucoesQueMultiteinerPoderiaOfertar: [],
    proximoPasosRecomendado: [],
    riscosLimitacoes: [],
    evidenciasPrincipais: [],
  }) as {
    ondeEstaOportunidade: string[]
    solucoesQueMultiteinerPoderiaOfertar: string[]
    proximoPasosRecomendado: string[]
    riscosLimitacoes: string[]
    evidenciasPrincipais: string[]
  }

  const licitacao: LicitacaoDetalhe = {
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
    analiseIa: row.analisesIa[0]
      ? {
          id: row.analisesIa[0].id,
          status: row.analisesIa[0].status,
          tipoAnalise: row.analisesIa[0].tipoAnalise,
          modeloUtilizado: row.analisesIa[0].modeloUtilizado,
          promptVersao: row.analisesIa[0].promptVersao,
          resultadoJson: row.analisesIa[0].resultadoJson,
          resumoTexto: row.analisesIa[0].resumoTexto,
          criadoEm: row.analisesIa[0].criadoEm.toISOString(),
        }
      : null,
    sinais: row.sinais.map((s) => ({
      id: s.id,
      categoria: s.categoria,
      subcategoria: s.subcategoria ?? null,
      sinal: s.sinal,
      nivel: s.nivel ?? null,
      trecho: s.trecho ?? null,
      fonteDocumento: s.fonteDocumento ?? null,
      relevancia: s.relevancia ?? null,
      criadoEm: s.criadoEm.toISOString(),
    })),
  }

  return { licitacao, configPesos, configFaixas, listasParecerTab }
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

  const { licitacao, configPesos, configFaixas, listasParecerTab } = await getLicitacao(id)

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
          {activeTab === 'ia' && (
            <IaTab licitacaoId={id} analiseIa={licitacao.analiseIa} />
          )}
          {activeTab === 'score' && (
            <ScoreTab
              licitacaoId={id}
              score={licitacao.score}
              analise={licitacao.analise}
              analiseIa={licitacao.analiseIa}
              configPesos={configPesos}
              configFaixas={configFaixas}
            />
          )}
          {activeTab === 'parecer' && (
            <ParecerTab
              licitacaoId={id}
              parecer={licitacao.parecer}
              score={licitacao.score}
              listasParecerTab={listasParecerTab}
            />
          )}
        </div>
      </div>
    </>
  )
}
