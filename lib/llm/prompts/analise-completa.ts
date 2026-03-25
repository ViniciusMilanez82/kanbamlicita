import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

export const SYSTEM_PROMPT = `Você é um analista especializado da Multiteiner, empresa brasileira que fornece estruturas modulares (containers adaptados, alojamentos de obra, escritórios modulares, vestiários, refeitórios).

Analise a licitação pública abaixo e responda APENAS com JSON válido, sem markdown, sem explicações extras. O JSON deve seguir exatamente o schema fornecido.`

export type AnaliseIaResult = {
  aderencia: {
    nivel: 'alta' | 'media' | 'baixa' | 'nenhuma'
    justificativa: string
  }
  oportunidades: Array<{
    tipo: string
    descricao: string
    forca: 'forte' | 'moderada' | 'fraca'
  }>
  riscos: string[]
  recomendacao: 'AVANCAR' | 'ACOMPANHAR' | 'DESCARTAR'
  resumo: string
  confianca: 'alta' | 'media' | 'baixa'
}

export function buildUserPrompt(licitacao: LicitacaoDetalhe): string {
  const lines: string[] = [
    `## Licitação`,
    `Órgão: ${licitacao.orgao ?? '—'}`,
    `Modalidade: ${licitacao.modalidade ?? '—'}`,
    `Segmento: ${licitacao.segmento ?? '—'}`,
    `UF: ${licitacao.uf ?? '—'} — Município: ${licitacao.municipio ?? '—'}`,
    ``,
    `## Objeto`,
    licitacao.objetoResumido ?? '(não informado)',
    ``,
  ]

  if (licitacao.itens.length > 0) {
    lines.push(`## Itens / Lotes (${licitacao.itens.length})`)
    licitacao.itens.slice(0, 20).forEach((item) => {
      lines.push(
        `- [${item.tipo ?? 'item'}] ${item.descricao ?? '—'} | Qtd: ${item.quantitativo ?? '—'} ${item.unidade ?? ''}`
      )
    })
    lines.push(``)
  }

  if (licitacao.analise) {
    lines.push(`## Análise manual existente`)
    lines.push(
      `Aderência direta: ${licitacao.analise.aderenciaDiretaNivel} (existe: ${licitacao.analise.aderenciaDiretaExiste})`
    )
    lines.push(`Aderência aplicação: ${licitacao.analise.aderenciaAplicacaoNivel}`)
    lines.push(`Contexto oculto: ${licitacao.analise.contextoOcultoNivel}`)
    if (licitacao.analise.oportunidadeOcultaResumo) {
      lines.push(`Oportunidade oculta: ${licitacao.analise.oportunidadeOcultaResumo}`)
    }
    lines.push(``)
  }

  lines.push(`## Schema de resposta esperado`)
  lines.push(
    JSON.stringify(
      {
        aderencia: { nivel: 'alta|media|baixa|nenhuma', justificativa: 'string' },
        oportunidades: [{ tipo: 'string', descricao: 'string', forca: 'forte|moderada|fraca' }],
        riscos: ['string'],
        recomendacao: 'AVANCAR|ACOMPANHAR|DESCARTAR',
        resumo: 'string (2-3 frases para o executivo)',
        confianca: 'alta|media|baixa',
      },
      null,
      2
    )
  )

  return lines.join('\n')
}
