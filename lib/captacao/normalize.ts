import { createHash } from 'node:crypto'

export type NormalizedLicitacao = {
  orgao: string | null
  numeroLicitacao: string | null
  objetoResumido: string
  dataPublicacao: Date | null
  numeroProcesso: string | null
  modalidade: string | null
  tipoDisputa: string | null
  criterioJulgamento: string | null
  segmento: string | null
  linkOrigem: string | null
  uf: string | null
  municipio: string | null
  regiao: string | null
  valorGlobalEstimado: number | null
  dataSessao: Date | null
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function trunc(s: string | null, max: number): string | null {
  if (s === null) return null
  return s.length <= max ? s : s.slice(0, max)
}

/** Fatias do JSON PNCP: raiz + blocos aninhados onde os mesmos campos reaparecem. */
function collectPncpRecordSlices(payload: Record<string, unknown>): Record<string, unknown>[] {
  const seen = new Set<Record<string, unknown>>()
  const out: Record<string, unknown>[] = []
  function push(r: Record<string, unknown> | null | undefined) {
    if (!r || seen.has(r)) return
    seen.add(r)
    out.push(r)
  }
  push(payload)
  for (const nk of ['compra', 'contratacao', 'licitacao'] as const) {
    const sub = payload[nk]
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const r = sub as Record<string, unknown>
      push(r)
      const uo = r.unidadeOrgao
      if (uo && typeof uo === 'object' && !Array.isArray(uo)) push(uo as Record<string, unknown>)
      const ent = r.orgaoEntidade
      if (ent && typeof ent === 'object' && !Array.isArray(ent)) push(ent as Record<string, unknown>)
    }
  }
  const topUo = payload.unidadeOrgao
  if (topUo && typeof topUo === 'object' && !Array.isArray(topUo)) push(topUo as Record<string, unknown>)
  const topEnt = payload.orgaoEntidade
  if (topEnt && typeof topEnt === 'object' && !Array.isArray(topEnt)) push(topEnt as Record<string, unknown>)
  return out
}

function pickStrFromSlices(slices: Record<string, unknown>[], keys: string[]): string | null {
  for (const rec of slices) {
    for (const k of keys) {
      const v = str(rec[k])
      if (v) return v
    }
  }
  return null
}

function parseDateFromSlices(slices: Record<string, unknown>[], keys: string[]): Date | null {
  for (const rec of slices) {
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'string' && v.trim()) {
        const d = new Date(v)
        if (!Number.isNaN(d.getTime())) return d
      }
    }
  }
  return null
}

function pickNumberFromSlices(slices: Record<string, unknown>[], keys: string[]): number | null {
  for (const rec of slices) {
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim()) {
        const n = Number.parseFloat(v.replace(/\s/g, '').replace(',', '.'))
        if (Number.isFinite(n)) return n
      }
    }
  }
  return null
}

/** Objeto em nível raiz ou dentro de blocos que o PNCP às vezes aninha na resposta de consulta. */
function objetoRawFromPayload(payload: Record<string, unknown>): string | null {
  const top =
    str(payload.objeto) ??
    str(payload.objetoCompra) ??
    str(payload.objeto_resumido) ??
    str(payload.descricao) ??
    str(payload.titulo)
  if (top) return top

  for (const nk of ['compra', 'contratacao', 'licitacao'] as const) {
    const sub = payload[nk]
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const r = sub as Record<string, unknown>
      const nested =
        str(r.objeto) ??
        str(r.objetoCompra) ??
        str(r.descricao) ??
        str(r.descricaoObjeto) ??
        str(r.titulo)
      if (nested) return nested
    }
  }
  return null
}

function orgaoFromPayload(payload: Record<string, unknown>): string | null {
  const direct =
    str(payload.orgao) ??
    str(payload.orgão) ??
    str(payload.orgao_nome) ??
    str(payload.nomeOrgao)
  if (direct) return direct

  const candidates: Record<string, unknown>[] = [payload]
  for (const nk of ['compra', 'contratacao', 'licitacao'] as const) {
    const sub = payload[nk]
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) candidates.push(sub as Record<string, unknown>)
  }
  for (const c of candidates) {
    const ent = c.orgaoEntidade
    if (ent && typeof ent === 'object' && !Array.isArray(ent)) {
      const o = ent as Record<string, unknown>
      const rs = str(o.razaoSocial) ?? str(o.nome)
      if (rs) return rs
    }
  }
  for (const c of candidates) {
    const uo = c.unidadeOrgao
    if (uo && typeof uo === 'object' && !Array.isArray(uo)) {
      const nu = str((uo as Record<string, unknown>).nomeUnidade)
      if (nu) return nu
    }
  }
  return null
}

function pickUf(payload: Record<string, unknown>): string | null {
  const slices = collectPncpRecordSlices(payload)
  let raw: string | null = null
  for (const rec of slices) {
    const uo = rec.unidadeOrgao
    if (uo && typeof uo === 'object' && !Array.isArray(uo)) {
      const r = uo as Record<string, unknown>
      raw = str(r.ufSigla) ?? str(r.siglaUf) ?? str(r.uf)
      if (raw) break
    }
  }
  if (!raw) raw = pickStrFromSlices(slices, ['ufSigla', 'siglaUf', 'uf'])
  if (!raw) return null
  const letters = raw.toUpperCase().replace(/[^A-Z]/g, '')
  if (letters.length >= 2) return letters.slice(0, 2)
  return raw.length >= 2 ? raw.slice(0, 2).toUpperCase() : null
}

function pickMunicipio(payload: Record<string, unknown>): string | null {
  for (const rec of collectPncpRecordSlices(payload)) {
    const uo = rec.unidadeOrgao
    if (uo && typeof uo === 'object' && !Array.isArray(uo)) {
      const r = uo as Record<string, unknown>
      const m = str(r.municipioNome) ?? str(r.nomeMunicipioIbge) ?? str(r.municipio)
      if (m) return trunc(m, 120)
    }
  }
  return null
}

function pickRegiao(payload: Record<string, unknown>): string | null {
  const slices = collectPncpRecordSlices(payload)
  for (const rec of slices) {
    const uo = rec.unidadeOrgao
    if (uo && typeof uo === 'object' && !Array.isArray(uo)) {
      const r = uo as Record<string, unknown>
      const nomeUf = str(r.ufNome)
      if (nomeUf) return trunc(nomeUf, 50)
    }
  }
  const flat = pickStrFromSlices(slices, ['nomeRegiao', 'regiao', 'regiaoNome'])
  return flat ? trunc(flat, 50) : null
}

function pickAmparoNome(payload: Record<string, unknown>): string | null {
  const slices = collectPncpRecordSlices(payload)
  for (const rec of slices) {
    const a = rec.amparoLegal
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      const n = str((a as Record<string, unknown>).nome) ?? str((a as Record<string, unknown>).descricao)
      if (n) return n
    }
  }
  return null
}

/** Normaliza payload bruto heterogêneo para campos de `Licitacao` (mock + PNCP API consulta). */
export function normalizePayloadBruto(payload: Record<string, unknown>): NormalizedLicitacao {
  const slices = collectPncpRecordSlices(payload)
  const orgao = orgaoFromPayload(payload)

  const numeroLicitacao = trunc(
    pickStrFromSlices(slices, [
      'numeroCompra',
      'numero',
      'numeroLicitacao',
      'numero_licitacao',
      'n_licitacao',
    ]),
    120
  )

  const objetoResumido = objetoRawFromPayload(payload) ?? 'Sem descrição'

  const dataPublicacao =
    parseDateFromSlices(slices, ['dataPublicacaoPncp', 'dataPublicacao', 'data_publicacao', 'dataInclusao']) ??
    null

  const numeroProcesso = trunc(pickStrFromSlices(slices, ['processo', 'numeroProcesso', 'numero_processo']), 120)

  const modalidade = trunc(
    pickStrFromSlices(slices, ['modalidadeNome', 'nomeModalidade', 'modalidade']),
    80
  )

  const tipoDisputa = trunc(
    pickStrFromSlices(slices, ['modoDisputaNome', 'tipoDisputaNome', 'modoDisputa', 'tipoDisputa']),
    80
  )

  const criterioJulgamento = trunc(
    pickStrFromSlices(slices, [
      'criterioJulgamentoNome',
      'nomeCriterioJulgamento',
      'criterioJulgamento',
      'criterio_julgamento',
    ]),
    120
  )

  const segmento = trunc(pickStrFromSlices(slices, ['segmento', 'nomeSegmento', 'segmentoNome']), 80)

  const linkOrigem =
    pickStrFromSlices(slices, ['linkProcessoEletronico', 'linkSistemaOrigem', 'linkCompra', 'linkPncp', 'link', 'url']) ??
    null

  const uf = pickUf(payload)
  const municipio = pickMunicipio(payload)
  const regiao = pickRegiao(payload)

  const valorHomologado = pickNumberFromSlices(slices, ['valorTotalHomologado'])
  const valorEstimado = pickNumberFromSlices(slices, ['valorTotalEstimado', 'valorTotal', 'valorEstimado', 'valorGlobal'])
  const valorGlobalEstimado =
    valorHomologado != null && valorHomologado > 0 ? valorHomologado : valorEstimado

  const dataSessao =
    parseDateFromSlices(slices, [
      'dataAberturaProposta',
      'dataHoraAbertura',
      'dataSessaoPublica',
      'dataSessao',
      'dataEncerramentoProposta',
    ]) ?? null

  const criterioFinal = criterioJulgamento ?? trunc(pickAmparoNome(payload), 120)

  return {
    orgao,
    numeroLicitacao,
    objetoResumido,
    dataPublicacao,
    numeroProcesso,
    modalidade,
    tipoDisputa,
    criterioJulgamento: criterioFinal,
    segmento,
    linkOrigem,
    uf,
    municipio,
    regiao,
    valorGlobalEstimado,
    dataSessao,
  }
}

/** Hash estável para dedupe por conteúdo (regra 3 do doc). */
export function buildDedupeHash(
  n: Pick<NormalizedLicitacao, 'orgao' | 'numeroLicitacao' | 'dataPublicacao' | 'objetoResumido'>
): string {
  const key = JSON.stringify({
    o: n.orgao ?? '',
    n: n.numeroLicitacao ?? '',
    d: n.dataPublicacao ? n.dataPublicacao.toISOString().slice(0, 10) : '',
    obj: n.objetoResumido.trim().toLowerCase(),
  })
  return createHash('sha256').update(key).digest('hex')
}
