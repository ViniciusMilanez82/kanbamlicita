import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { db } from '../lib/db'
import { montarLicitacaoBoletim } from '../lib/conlicitacao/normalize'
import type { BoletimRow } from '../lib/conlicitacao/types'

type Item = BoletimRow & { boletim?: string; raw?: Record<string, string> }

const RAW_KEYS = [
  'numeroConlicitacao', 'codigo', 'orgao', 'endereco', 'cidade', 'estado', 'cep',
  'edital', 'site1', 'site2', 'processo', 'valorEstimado', 'itens', 'situacao',
  'documento', 'abertura', 'prazo', 'objeto', 'observacao', 'anexos', 'atualizadaEm',
  'boletim',
] as const

function nn(v?: string): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

async function main() {
  const arquivo = process.argv[2]
  if (!arquivo) {
    console.error('uso: tsx importar-boletins.ts <arquivo.json>')
    process.exit(1)
  }
  const conteudo = JSON.parse(readFileSync(arquivo, 'utf-8')) as { itens: Item[] }
  const itens = conteudo.itens
  if (!Array.isArray(itens) || itens.length === 0) {
    console.error('JSON sem itens[]')
    process.exit(1)
  }
  console.log(`Lidas ${itens.length} linhas de ${arquivo}`)

  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: 'inicial', ativo: true },
    orderBy: { ordem: 'asc' },
  })
  if (!colunaInicial) {
    console.error('Nenhuma coluna inicial configurada')
    process.exit(1)
  }
  const fonte = await db.fonteCaptacao.findFirst({
    where: { tipo: 'conlicitacao', ativo: true },
    select: { id: true },
  })
  console.log(`Coluna inicial: ${colunaInicial.nome} | fonte: ${fonte?.id ?? '(nenhuma)'}`)

  let criados = 0
  let duplicados = 0
  let erros = 0
  const vistos = new Set<string>()

  for (let i = 0; i < itens.length; i++) {
    const row = itens[i]
    const dados = montarLicitacaoBoletim(row)
    const boletim = row.boletim?.trim()
    const observacoes = boletim
      ? `${dados.observacoes} Boletim ConLicitação nº ${boletim}.`
      : dados.observacoes
    const raw = row.raw ?? {}
    const boletimData = Object.fromEntries(RAW_KEYS.map((k) => [k, nn(raw[k])]))
    try {
      if (vistos.has(dados.dedupId)) {
        duplicados++
        continue
      }
      vistos.add(dados.dedupId)

      await db.licitacao.create({
        data: {
          titulo: dados.titulo,
          orgao: dados.orgao,
          objeto: dados.objeto,
          modalidade: dados.modalidade,
          uf: dados.uf,
          municipio: dados.municipio,
          valorEstimado: dados.valorEstimado,
          dataPublicacao: dados.dataPublicacao,
          dataSessao: dados.dataSessao,
          processo: dados.processo,
          numeroCompra: dados.numeroCompra,
          informacaoComplementar: dados.informacaoComplementar,
          linkOrigem: dados.dedupId,
          linkSistemaOrigem: dados.linkSistemaOrigem,
          observacoes,
          dadosExtraidos: raw as object,
          fonteId: fonte?.id ?? null,
          card: { create: { colunaId: colunaInicial.id, ordem: 0 } },
          boletimDados: { create: boletimData },
        },
        select: { id: true },
      })
      criados++
    } catch (e) {
      erros++
      if (erros <= 8) console.error('  erro na linha', i + 1, e instanceof Error ? e.message : e)
    }
    if ((i + 1) % 500 === 0)
      console.log(`  ${i + 1}/${itens.length} (criados=${criados} dup=${duplicados} erros=${erros})`)
  }

  console.log(`FIM total=${itens.length} criados=${criados} duplicados=${duplicados} erros=${erros}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
