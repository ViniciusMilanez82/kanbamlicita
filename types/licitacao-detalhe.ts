import type { KanbanColuna } from '@/lib/kanban'

export type CardDetalhe = {
  id: string
  colunaAtual: KanbanColuna
  urgente: boolean
  bloqueado: boolean
  motivoBloqueio: string | null
}

export type ScoreDetalhe = {
  scoreFinal: number
  faixaClassificacao: string
  valorCapturavelEstimado: number | null
  falsoNegativoNivelRisco: string
} | null

export type DocumentosDetalhe = {
  possuiEdital: boolean
  possuiTermoReferencia: boolean
  possuiProjetoBasico: boolean
  possuiMemorialDescritivo: boolean
  possuiAnexosTecnicos: boolean
  possuiPlanilhaOrcamentaria: boolean
  possuiCronograma: boolean
  possuiMinutaContratual: boolean
  lacunasDocumentais: string | null
} | null

export type ItemDetalhe = {
  id: string
  tipo: string | null
  identificador: string | null
  descricao: string | null
  quantitativo: number | null
  unidade: string | null
  aderencia: string
  prioridade: string
  valorEstimadoItem: number | null
  observacoes: string | null
}

export type AnaliseDetalhe = {
  aderenciaDiretaExiste: boolean
  aderenciaDiretaNivel: string
  aderenciaAplicacaoExiste: boolean
  aderenciaAplicacaoNivel: string
  contextoOcultoExiste: boolean
  contextoOcultoNivel: string
  oportunidadeOcultaExiste: boolean
  oportunidadeOcultaForca: string
  oportunidadeOcultaResumo: string | null
  oportunidadeNoObjeto: boolean
  oportunidadeNoTr: boolean
  oportunidadeNosLotes: boolean
  oportunidadeNosItens: boolean
  oportunidadeNaPlanilha: boolean
  oportunidadeNoMemorial: boolean
  oportunidadeEmAnexoTecnico: boolean
  portfolioAplicavel: unknown[]
  solucoesMuliteinerAplicaveis: unknown[]
} | null

export type MovimentacaoDetalhe = {
  id: string
  colunaOrigem: string | null
  colunaDestino: string
  motivo: string | null
  automatico: boolean
  criadoEm: string
}

export type AnaliseIaDetalhe = {
  id: string
  status: string          // 'EM_PROCESSAMENTO' | 'CONCLUIDO' | 'ERRO'
  tipoAnalise: string
  modeloUtilizado: string | null
  promptVersao: string | null
  resultadoJson: unknown  // AnaliseIaResult quando status='CONCLUIDO'
  resumoTexto: string | null
  criadoEm: string
} | null

export type LicitacaoDetalhe = {
  id: string
  orgao: string | null
  numeroLicitacao: string | null
  numeroProcesso: string | null
  modalidade: string | null
  tipoDisputa: string | null
  criterioJulgamento: string | null
  objetoResumido: string | null
  resumoNatureza: string | null
  segmento: string | null
  dataPublicacao: string | null
  dataSessao: string | null
  uf: string | null
  municipio: string | null
  regiao: string | null
  valorGlobalEstimado: number | null
  moeda: string
  statusPipeline: string
  linkOrigem: string | null
  fonteCaptacao: string | null
  // flags estruturais
  possuiLotes: boolean
  possuiItens: boolean
  possuiPlanilhaOrcamentaria: boolean
  possuiQuantitativos: boolean
  possuiPrecosUnitarios: boolean
  // natureza do objeto
  envolveLocacao: boolean
  envolveFornecimento: boolean
  envolveServico: boolean
  envolveObra: boolean
  envolveInstalacao: boolean
  envolveMontagem: boolean
  envolveDesmontagem: boolean
  envolveTransporte: boolean
  envolveMobilizacao: boolean
  envolveDesmobilizacao: boolean
  envolveManutencao: boolean
  // relações
  card: CardDetalhe | null
  score: ScoreDetalhe
  documentos: DocumentosDetalhe
  itens: ItemDetalhe[]
  analise: AnaliseDetalhe
  movimentacoes: MovimentacaoDetalhe[]
  analiseIa: AnaliseIaDetalhe
}
