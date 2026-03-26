import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { KanbanColuna } from '../lib/generated/prisma/enums'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SEGMENTOS = ['Construção Civil', 'Offshore', 'Eventos', 'Apoio Logístico']
const ORGAOS = [
  'Ministério da Infraestrutura',
  'Petrobras S.A.',
  'Prefeitura de São Paulo',
  'Governo do Estado do RJ',
  'Marinha do Brasil',
  'Vale S.A.',
  'Infraero',
  'DNIT',
]
const UFS = ['SP', 'RJ', 'MG', 'BA', 'RS', 'PE', 'AM', 'PA']
const MUNICIPIOS: Record<string, string> = {
  SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Belo Horizonte',
  BA: 'Salvador', RS: 'Porto Alegre', PE: 'Recife', AM: 'Manaus', PA: 'Belém',
}
const MODALIDADES = ['Pregão Eletrônico', 'Concorrência', 'Tomada de Preços', 'Dispensa']

const LISTAS_PARECER_TAB = {
  ondeEstaOportunidade: ['objeto', 'tr', 'lotes', 'itens', 'planilha', 'memorial', 'anexo_tecnico'],
  solucoesQueMultiteinerPoderiaOfertar: [
    'containers_adaptados', 'modulos_habitacionais', 'modulos_administrativos',
    'modulos_sanitarios', 'guaritas', 'almoxarifados', 'refeitorios',
    'alojamentos', 'escritorios_de_obra', 'bases_operacionais', 'estruturas_temporarias_modulares',
  ],
  proximoPasosRecomendado: [
    'elaborar_proposta', 'solicitar_esclarecimentos', 'visitar_local', 'contatar_gestor',
    'acompanhar_publicacao', 'montar_consorcio', 'aguardar_nova_edicao',
    'solicitar_visita_tecnica', 'preparar_amostra', 'cadastrar_fornecedor',
  ],
  riscosLimitacoes: [
    'prazo_curto', 'exigencia_tecnica_restritiva', 'capacidade_limitada',
    'concorrencia_acirrada', 'preco_referencia_baixo', 'localizacao_desfavoravel',
    'habilitacao_complexa', 'historico_direcionamento', 'escopo_indefinido', 'dependencia_de_parceiro',
  ],
  evidenciasPrincipais: [
    'mencao_explicita_no_tr', 'mencao_em_item_ou_lote', 'descricao_tecnica_compativel',
    'quantitativo_compativel', 'aderencia_ao_portfolio', 'historico_de_relacionamento',
    'preco_referencia_compativel', 'concorrente_fraco_identificado',
  ],
}

// Distribuição das 30 licitações pelas 9 colunas
const DISTRIBUICAO: { coluna: KanbanColuna; quantidade: number }[] = [
  { coluna: KanbanColuna.captadas_automaticamente, quantidade: 8 },
  { coluna: KanbanColuna.triagem_inicial, quantidade: 6 },
  { coluna: KanbanColuna.em_analise, quantidade: 6 },
  { coluna: KanbanColuna.viavel_comercialmente, quantidade: 4 },
  { coluna: KanbanColuna.proposta_documentacao, quantidade: 2 },
  { coluna: KanbanColuna.enviadas_participando, quantidade: 1 },
  { coluna: KanbanColuna.ganhamos, quantidade: 1 },
  { coluna: KanbanColuna.perdemos, quantidade: 1 },
  { coluna: KanbanColuna.descartadas, quantidade: 1 },
]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function futureDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

type FaixaClassificacao = 'A+' | 'A' | 'B' | 'C' | 'D'

function scoreToFaixa(score: number): FaixaClassificacao {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

async function main() {
  console.log('Limpando dados existentes...')
  await prisma.kanbanMovimentacao.deleteMany()
  await prisma.kanbanCard.deleteMany()
  await prisma.licitacaoScore.deleteMany()
  await prisma.licitacao.deleteMany()

  console.log('Criando 30 licitações...')

  let licitacaoIndex = 0

  for (const { coluna, quantidade } of DISTRIBUICAO) {
    for (let i = 0; i < quantidade; i++) {
      licitacaoIndex++

      const uf = rand(UFS)
      const segmento = rand(SEGMENTOS)
      const valorGlobal = randInt(200, 15000) * 1000
      const valorCapturavel = Math.random() < 0.9
        ? randInt(50, 2000) * 1000
        : null

      // Cenários especiais para testes:
      // licitações 1-6: urgente = true (~20%)
      const urgente = licitacaoIndex <= 6
      // licitações 7-11: FN alto (~15%)
      const fnAlto = licitacaoIndex >= 7 && licitacaoIndex <= 11
      // licitações 12-14: sem score (score = null)
      const semScore = licitacaoIndex >= 12 && licitacaoIndex <= 14

      const scoreValor = semScore ? null : randInt(20, 98)

      const licitacao = await prisma.licitacao.create({
        data: {
          orgao: rand(ORGAOS),
          numeroLicitacao: `PE ${String(licitacaoIndex).padStart(3, '0')}/2026`,
          modalidade: rand(MODALIDADES),
          objetoResumido: `Locação de módulos e estruturas temporárias para apoio operacional em ${MUNICIPIOS[uf]}`,
          segmento,
          uf,
          municipio: MUNICIPIOS[uf],
          dataSessao: futureDays(randInt(5, 60)),
          valorGlobalEstimado: valorGlobal,
          fonteCaptacao: 'seed',
          statusPipeline: 'ativo',
        },
      })

      // Card Kanban
      await prisma.kanbanCard.create({
        data: {
          licitacaoId: licitacao.id,
          colunaAtual: coluna,
          urgente,
          bloqueado: false,
        },
      })

      // Score (null para licitações 12-14)
      if (!semScore && scoreValor !== null) {
        const faixa = scoreToFaixa(scoreValor)
        await prisma.licitacaoScore.create({
          data: {
            licitacaoId: licitacao.id,
            scoreFinal: scoreValor,
            faixaClassificacao: faixa,
            valorCapturavelEstimado: valorCapturavel,
            falsoNegativoNivelRisco: fnAlto ? 'alto' : rand(['baixo', 'baixo', 'baixo', 'medio']),
            falsoNegativoResumo: fnAlto
              ? 'Título genérico. Oportunidade pode estar escondida nos lotes.'
              : 'Sem indicadores relevantes de falso negativo.',
            valorCapturavelJustificativa: valorCapturavel
              ? 'Estimativa baseada em itens da planilha orçamentária.'
              : 'Não foi possível estimar com os documentos disponíveis.',
          },
        })
      }
    }
  }

  console.log(`✓ ${licitacaoIndex} licitações criadas com sucesso.`)

  console.log('Criando configuracao do sistema...')
  await prisma.configuracaoSistema.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      pesosScore: { aderenciaDireta: 15, aderenciaAplicacao: 25, contextoOculto: 20, modeloComercial: 15, potencialEconomico: 15, qualidadeEvidencia: 10 },
      faixasScore: { aPlus: 85, a: 70, b: 55, c: 40 },
      segmentos: [],
      listasParecerTab: LISTAS_PARECER_TAB,
    },
    update: {
      pesosScore: { aderenciaDireta: 15, aderenciaAplicacao: 25, contextoOculto: 20, modeloComercial: 15, potencialEconomico: 15, qualidadeEvidencia: 10 },
      faixasScore: { aPlus: 85, a: 70, b: 55, c: 40 },
      segmentos: [],
      listasParecerTab: LISTAS_PARECER_TAB,
    },
  })
  console.log('✓ ConfiguracaoSistema criada.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
