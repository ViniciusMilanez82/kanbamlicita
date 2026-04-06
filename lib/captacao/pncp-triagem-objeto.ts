import { normalizePayloadBruto } from './normalize'
import type { CaptacaoRegistroBruto } from './types'

/** Texto sem acentos, minúsculas — para busca tolerante. */
export function normalizarTextoBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

const CAMPOS_TEXTO_TRIAGEM = [
  'informacaoComplementar',
  'processo',
  'numeroCompra',
  'modalidadeNome',
  'modoDisputaNome',
  'tipoInstrumentoConvocatorioNome',
] as const

function pushCamposTextoTriagem(rec: Record<string, unknown>, parts: string[]) {
  for (const k of CAMPOS_TEXTO_TRIAGEM) {
    const v = rec[k]
    if (typeof v === 'string' && v.trim()) parts.push(v)
  }
}

/**
 * Texto usado na triagem: mesmo núcleo da normalização (objeto, objetoCompra, etc.)
 * mais campos onde o PNCP costuma repetir o escopo (raiz e objetos aninhados).
 */
export function textoParaTriagem(payload: Record<string, unknown>): string {
  const n = normalizePayloadBruto(payload)
  const parts: string[] = [n.objetoResumido]
  pushCamposTextoTriagem(payload, parts)
  for (const nk of ['compra', 'contratacao', 'licitacao'] as const) {
    const sub = payload[nk]
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      pushCamposTextoTriagem(sub as Record<string, unknown>, parts)
    }
  }
  return parts.join('\n')
}

/** @deprecated use textoParaTriagem — mantido para testes legados */
export function extrairObjetoCompra(payload: Record<string, unknown>): string {
  const o = payload.objetoCompra
  return typeof o === 'string' ? o : ''
}

/** Aceita sinónimos de chave na JSON da fonte (evita “salvou mas não leu”). */
export function collectPalavrasTriagem(cfg: Record<string, unknown>): string[] {
  const tri =
    cfg.triagem && typeof cfg.triagem === 'object' && cfg.triagem !== null
      ? (cfg.triagem as Record<string, unknown>)
      : null
  const from =
    cfg.palavrasChaveObjeto ??
    cfg.palavrasChave ??
    cfg.filtroTextoObjeto ??
    cfg.keywordsObjeto ??
    tri?.palavrasChaveObjeto ??
    tri?.palavras
  return parsePalavrasChaveObjeto(from)
}

/** Aceita string "a, b" / linhas ou array JSON na config da fonte. */
export function parsePalavrasChaveObjeto(raw: unknown): string[] {
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    return [String(raw)]
  }
  if (Array.isArray(raw)) {
    return raw.map(String).flatMap((s) => s.split(/[,;\n]+/)).map((s) => s.trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** Pelo menos uma palavra/chave deve aparecer no texto agregado (OU). */
export function passaTriagemObjeto(payload: Record<string, unknown>, palavras: string[]): boolean {
  if (palavras.length === 0) return true
  const hay = normalizarTextoBusca(textoParaTriagem(payload))
  return palavras.some((p) => hay.includes(normalizarTextoBusca(p)))
}

export function filtrarRegistrosTriagemObjeto(
  registros: CaptacaoRegistroBruto[],
  palavras: string[]
): CaptacaoRegistroBruto[] {
  if (palavras.length === 0) return registros
  return registros.filter((r) => passaTriagemObjeto(r.payloadBruto, palavras))
}
