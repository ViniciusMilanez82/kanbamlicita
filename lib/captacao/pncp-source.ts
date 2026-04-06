import {
  collectPalavrasTriagem,
  filtrarRegistrosTriagemObjeto,
} from './pncp-triagem-objeto'
import type { CaptacaoRegistroBruto, CaptacaoSource } from './types'

/** Base pública da API de consultas (Swagger: https://pncp.gov.br/api/consulta/swagger-ui/index.html). */
const DEFAULT_PNCP_BASE = 'https://pncp.gov.br/api/consulta'

export type PncpModoConsulta = 'atualizacao' | 'publicacao' | 'proposta'

export type PncpFonteConfig = {
  /** Padrão: atualização global (útil para sync incremental). */
  modo?: PncpModoConsulta
  /** Obrigatório para `atualizacao` e `publicacao` (ex.: 6 = Pregão Eletrônico). */
  codigoModalidadeContratacao?: number
  codigoModoDisputa?: number
  uf?: string
  codigoMunicipioIbge?: string
  cnpj?: string
  codigoUnidadeAdministrativa?: string
  idUsuario?: number
  /** Janela em dias (Brasil) para dataInicial/dataFinal; ignorado em `proposta`. Padrão: 7. */
  diasJanela?: number
  /** 10–50 (API). Padrão: 50. */
  tamanhoPagina?: number
  /** Limite de páginas por execução (evita estourar tempo/cota). Padrão: 20. */
  maxPaginas?: number
  /**
   * Triagem antecipada (funil): só entra no Kanban quem tiver pelo menos uma dessas
   * substrings no campo objetoCompra (API PNCP). Vírgula ou linha separa termos; OR entre termos.
   */
  palavrasChaveObjeto?: string | string[]
}

type PaginaCompras = {
  data?: unknown[]
  totalRegistros?: number
  totalPaginas?: number
  numeroPagina?: number
  paginasRestantes?: number
  empty?: boolean
}

/** Padrão generoso: API pública do governo costuma oscilar. */
const DEFAULT_TIMEOUT_PROBE_MS = 120_000
const DEFAULT_TIMEOUT_PAGE_MS = 240_000

const ERRO_PNCP_TIMEOUT_PT =
  'O portal PNCP não respondeu a tempo. Tente de novo em instantes, reduza «máx. páginas» ou estreite UF/palavras. ' +
  'No servidor: PNCP_FETCH_TIMEOUT_MS_PROBE (busca) ou PNCP_FETCH_TIMEOUT_MS_PAGE (cada página na importação).'

/** Resposta 5xx típica do PNCP quando o banco deles falha (JDBC). Não é bug do app local. */
const ERRO_PNCP_JDBC_PT =
  'O portal PNCP está instável no momento (falha no banco de dados do servidor oficial — ex.: JDBC). ' +
  'Isso não é erro da sua configuração aqui. Tente de novo em alguns minutos.'

/**
 * Corpo JSON de erro do PNCP costuma trazer `message` legível; evita mostrar blob cru na UI.
 */
export function formatPncpHttpErroLegivel(status: number, bodyText: string): string {
  let detail = bodyText.slice(0, 1200)
  try {
    const j = JSON.parse(bodyText) as { message?: string }
    if (typeof j.message === 'string' && j.message.trim()) detail = j.message
  } catch {
    // ignore
  }
  const lower = detail.toLowerCase()
  if (status === 502 || status === 503 || status === 504) {
    return 'O portal PNCP está indisponível ou sobrecarregado (' + status + '). Tente de novo em instantes.'
  }
  if (status >= 500 && status < 600) {
    if (lower.includes('jdbc') || lower.includes('failed to obtain') || lower.includes('connection pool')) {
      return ERRO_PNCP_JDBC_PT
    }
    return 'O portal PNCP retornou erro ' + status + ' (servidor oficial). Tente de novo em alguns minutos.'
  }
  return `HTTP ${status}: ${detail.slice(0, 400)}`
}

function pncpFetchTimeoutMs(kind: 'probe' | 'page'): number {
  const raw = kind === 'probe' ? process.env.PNCP_FETCH_TIMEOUT_MS_PROBE : process.env.PNCP_FETCH_TIMEOUT_MS_PAGE
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : NaN
  if (Number.isFinite(n) && n >= 5_000) return n
  return kind === 'probe' ? DEFAULT_TIMEOUT_PROBE_MS : DEFAULT_TIMEOUT_PAGE_MS
}

function isFetchTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const name = e.name
  if (name === 'TimeoutError' || name === 'AbortError') return true
  const m = e.message
  return /aborted/i.test(m) && /timeout/i.test(m)
}

function fetchTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const ac = new AbortController()
  setTimeout(() => ac.abort(), ms)
  return ac.signal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Evita rajadas contra o PNCP entre páginas (import / busca completa). */
function pncpInterPageDelayMs(): number {
  if (process.env.NODE_ENV === 'test') return 0
  const n = Number.parseInt(process.env.PNCP_INTER_PAGE_DELAY_MS ?? '450', 10)
  return Number.isFinite(n) && n >= 0 && n <= 60_000 ? n : 450
}

function pncpRetryMaxAttempts(): number {
  const n = Number.parseInt(process.env.PNCP_FETCH_RETRY_MAX ?? '3', 10)
  return Number.isFinite(n) && n >= 1 && n <= 8 ? n : 3
}

function pncpRetryDelayMs(attemptIndex: number): number {
  if (process.env.NODE_ENV === 'test') return 0
  const base = Number.parseInt(process.env.PNCP_FETCH_RETRY_BASE_MS ?? '1400', 10)
  const b = Number.isFinite(base) && base >= 300 ? base : 1400
  return b * 2 ** attemptIndex
}

function deveRetentarHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}

/** Uma requisição GET ao PNCP com retentativas em 5xx / timeout (estratégia anti-instabilidade). */
async function fetchPncpUmaPagina(fetchFn: typeof fetch, url: string): Promise<Response> {
  const max = pncpRetryMaxAttempts()
  let lastMessage = 'PNCP: falha após tentativas.'
  for (let attempt = 0; attempt < max; attempt++) {
    if (attempt > 0) {
      await sleep(pncpRetryDelayMs(attempt - 1))
    }
    try {
      const signalPage = fetchTimeoutSignal(pncpFetchTimeoutMs('page'))
      const res = await fetchFn(url, {
        headers: { Accept: 'application/json' },
        ...(signalPage ? { signal: signalPage } : {}),
      })
      if (res.status === 204) return res
      if (res.ok) return res
      const text = await res.text()
      lastMessage = formatPncpHttpErroLegivel(res.status, text)
      if (deveRetentarHttpStatus(res.status) && attempt < max - 1) continue
      throw new Error(lastMessage)
    } catch (e) {
      if (isFetchTimeoutError(e)) {
        lastMessage = ERRO_PNCP_TIMEOUT_PT
        if (attempt < max - 1) continue
        throw new Error(`${lastMessage} (após ${max} tentativas.)`)
      }
      throw e
    }
  }
  throw new Error(`${lastMessage} (após ${max} tentativas.)`)
}

function envBaseUrl(): string {
  const v = process.env.PNCP_CONSULTA_BASE_URL?.trim()
  return v && v.length > 0 ? v.replace(/\/$/, '') : DEFAULT_PNCP_BASE
}

function brazilYyyyMmDd(d: Date): string {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  return s.replace(/-/g, '')
}

function parseConfig(raw: unknown): PncpFonteConfig {
  if (raw === null || raw === undefined) return {}
  let v: unknown = raw
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw) as unknown
    } catch {
      return {}
    }
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  return v as PncpFonteConfig
}

/** Pregão Eletrônico — boa opção padrão quando a fonte não define modalidade. */
export const PNCP_MODALIDADE_PADRAO = 6

/**
 * Preenche omissões comuns para fonte PNCP funcionar sem JSON manual.
 * Em `proposta`, modalidade continua opcional (API aceita sem filtro).
 */
export function mergePncpConfigDefaults(raw: unknown): PncpFonteConfig {
  let plain: unknown = raw
  if (raw !== null && raw !== undefined) {
    try {
      plain = JSON.parse(JSON.stringify(raw))
    } catch {
      plain = raw
    }
  }
  const cfg = parseConfig(plain)
  const modo = cfg.modo ?? 'atualizacao'
  const out: PncpFonteConfig = {
    ...cfg,
    modo,
    diasJanela: cfg.diasJanela ?? 7,
    tamanhoPagina: cfg.tamanhoPagina ?? 50,
    maxPaginas: cfg.maxPaginas ?? 20,
  }
  if (modo !== 'proposta') {
    const m = cfg.codigoModalidadeContratacao
    if (m === undefined || Number.isNaN(Number(m))) {
      out.codigoModalidadeContratacao = PNCP_MODALIDADE_PADRAO
    }
  }
  return out
}

export type PncpProbeOk = {
  ok: true
  totalRegistros: number
  /** Itens da 1ª página que passaram na triagem por objeto (igual ao sync). */
  registrosNaPrimeiraPagina: number
  /** Quantos itens a API devolveu na 1ª página antes da triagem (só quando triagem ativa). */
  registrosNaPrimeiraPaginaBruta?: number
  totalPaginas: number
  modo: PncpModoConsulta
  dataInicial?: string
  dataFinal: string
  urlConsultada: string
  /** Máximo de registros que uma importação pode processar (páginas × tamanho da página). */
  limitePorExecucao: number
  triagemObjetoAtiva: boolean
  palavrasTriagemCount: number
  /** Soma de itens brutos em todas as páginas percorridas (mesmo critério do passo «Trazer»). */
  registrosBrutosNoLote: number
  /** Quantos entram no lote após triagem por objeto, somando todas as páginas percorridas. */
  registrosAposTriagemNoLote: number
  /** Páginas efetivamente consultadas nesta busca (≤ máx. páginas da fonte). */
  paginasPercorridasNoLote: number
  /** false = busca rápida (só 1ª página); true = mesmas páginas que o import até o teto. */
  escaneamentoLoteCompleto: boolean
  /** Máx. páginas configurado na fonte (referência na UI). */
  maxPaginasFonte: number
}

export type PncpProbeErro = { ok: false; erro: string; urlConsultada?: string }

export type PncpProbeResult = PncpProbeOk | PncpProbeErro

function compraToRegistro(item: unknown): CaptacaoRegistroBruto {
  const o = item as Record<string, unknown>
  const id =
    typeof o.numeroControlePNCP === 'string' && o.numeroControlePNCP.trim()
      ? o.numeroControlePNCP.trim()
      : null
  return {
    idExternoOrigem: id,
    payloadBruto: JSON.parse(JSON.stringify(item)) as Record<string, unknown>,
  }
}

export function buildPncpComprasUrl(
  baseUrl: string,
  modo: PncpModoConsulta,
  params: Record<string, string | number | undefined>
): string {
  const base = baseUrl.replace(/\/$/, '')
  const pathRel =
    modo === 'atualizacao'
      ? 'v1/contratacoes/atualizacao'
      : modo === 'publicacao'
        ? 'v1/contratacoes/publicacao'
        : 'v1/contratacoes/proposta'
  // Não usar path com "/" inicial: new URL("/v1/...", "https://host/api/consulta/")
  // viraria https://host/v1/... (perde /api/consulta) e o PNCP devolve HTML 404.
  const u = new URL(`${base}/${pathRel}`)
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue
    u.searchParams.set(k, String(v))
  }
  return u.toString()
}

/** Mesma paginação e triagem que o sync/import — usado pelo probe (preview) e por `createPncpSource`. */
async function executarConsultaPncpPaginada(input: {
  endpointBase: string | null
  configuracao: unknown
  fetchImpl?: typeof fetch
  /** true: só 1 chamada (1ª página) — menos pressão no PNCP na busca rápida. */
  apenasPrimeiraPagina?: boolean
}): Promise<{
  registros: CaptacaoRegistroBruto[]
  totalRegistrosCatalogo: number
  totalPaginasApi: number
  paginasPercorridas: number
  itensBrutosNoLote: number
  primeiraPaginaBrutos: number
  primeiraPaginaFiltrados: number
  urlPrimeiraPagina: string
  modo: PncpModoConsulta
  dataInicial?: string
  dataFinal: string
  limitePorExecucao: number
  triagemObjetoAtiva: boolean
  palavrasTriagemCount: number
  maxPaginasConfigurado: number
}> {
  const fetchFn = input.fetchImpl ?? fetch
  const cfg = mergePncpConfigDefaults(input.configuracao)
  const modo = cfg.modo ?? 'atualizacao'
  const tamanhoPagina = Math.min(50, Math.max(10, cfg.tamanhoPagina ?? 50))
  const maxPaginas = cfg.maxPaginas ?? 20
  const diasJanela = Math.max(1, cfg.diasJanela ?? 7)
  const palavrasTriagem = collectPalavrasTriagem(cfg as unknown as Record<string, unknown>)
  const base = (input.endpointBase?.trim() || envBaseUrl()).replace(/\/$/, '')
  const modalidade = cfg.codigoModalidadeContratacao

  const hoje = new Date()
  const dataFinal = brazilYyyyMmDd(hoje)
  const dataInicial = brazilYyyyMmDd(new Date(hoje.getTime() - (diasJanela - 1) * 86400000))
  const limitePorExecucao = maxPaginas * tamanhoPagina
  const apenasPrimeiraPagina = input.apenasPrimeiraPagina === true

  const registros: CaptacaoRegistroBruto[] = []
  let pagina = 1
  let urlPrimeiraPagina = ''
  let totalRegistrosCatalogo = 0
  let totalPaginasApi = 0
  let paginasPercorridas = 0
  let itensBrutosNoLote = 0
  let primeiraPaginaBrutos = 0
  let primeiraPaginaFiltrados = 0

  while (pagina <= maxPaginas) {
    if (pagina > 1 && !apenasPrimeiraPagina) {
      const delayMs = pncpInterPageDelayMs()
      if (delayMs > 0) await sleep(delayMs)
    }
    const common: Record<string, string | number | undefined> = {
      pagina,
      tamanhoPagina,
      codigoModoDisputa: cfg.codigoModoDisputa,
      uf: cfg.uf,
      codigoMunicipioIbge: cfg.codigoMunicipioIbge,
      cnpj: cfg.cnpj,
      codigoUnidadeAdministrativa: cfg.codigoUnidadeAdministrativa,
      idUsuario: cfg.idUsuario,
    }

    let url: string
    if (modo === 'proposta') {
      url = buildPncpComprasUrl(base, 'proposta', {
        ...common,
        dataFinal,
        codigoModalidadeContratacao: cfg.codigoModalidadeContratacao,
      })
    } else if (modo === 'publicacao') {
      url = buildPncpComprasUrl(base, 'publicacao', {
        ...common,
        dataInicial,
        dataFinal,
        codigoModalidadeContratacao: modalidade,
      })
    } else {
      url = buildPncpComprasUrl(base, 'atualizacao', {
        ...common,
        dataInicial,
        dataFinal,
        codigoModalidadeContratacao: modalidade,
      })
    }

    if (pagina === 1) urlPrimeiraPagina = url

    const res = await fetchPncpUmaPagina(fetchFn, url)

    if (res.status === 204) {
      if (pagina === 1) {
        return {
          registros: [],
          totalRegistrosCatalogo: 0,
          totalPaginasApi: 0,
          paginasPercorridas: 0,
          itensBrutosNoLote: 0,
          primeiraPaginaBrutos: 0,
          primeiraPaginaFiltrados: 0,
          urlPrimeiraPagina: url,
          modo,
          dataInicial: modo === 'proposta' ? undefined : dataInicial,
          dataFinal,
          limitePorExecucao,
          triagemObjetoAtiva: palavrasTriagem.length > 0,
          palavrasTriagemCount: palavrasTriagem.length,
          maxPaginasConfigurado: maxPaginas,
        }
      }
      break
    }

    const text = await res.text()
    if (!res.ok) {
      throw new Error(formatPncpHttpErroLegivel(res.status, text))
    }

    let body: PaginaCompras
    try {
      body = JSON.parse(text) as PaginaCompras
    } catch {
      throw new Error(`PNCP: resposta JSON inválida na página ${pagina}`)
    }

    paginasPercorridas += 1

    if (pagina === 1) {
      totalRegistrosCatalogo = Number(body.totalRegistros ?? 0)
      totalPaginasApi = Number(body.totalPaginas ?? 0)
    }

    const rows = Array.isArray(body.data) ? body.data : []
    itensBrutosNoLote += rows.length
    const pageRegs = rows.map((row) => compraToRegistro(row))
    const filtrados = filtrarRegistrosTriagemObjeto(pageRegs, palavrasTriagem)
    registros.push(...filtrados)

    if (pagina === 1) {
      primeiraPaginaBrutos = rows.length
      primeiraPaginaFiltrados = filtrados.length
    }

    const restantes = body.paginasRestantes ?? 0
    const totalPaginas = body.totalPaginas ?? 0
    const num = body.numeroPagina ?? pagina

    if (rows.length === 0 || body.empty) break
    if (totalPaginas > 0 && num >= totalPaginas) break
    if (restantes === 0) break

    if (apenasPrimeiraPagina) break

    pagina += 1
  }

  return {
    registros,
    totalRegistrosCatalogo,
    totalPaginasApi,
    paginasPercorridas,
    itensBrutosNoLote,
    primeiraPaginaBrutos,
    primeiraPaginaFiltrados,
    urlPrimeiraPagina,
    modo,
    dataInicial: modo === 'proposta' ? undefined : dataInicial,
    dataFinal,
    limitePorExecucao,
    triagemObjetoAtiva: palavrasTriagem.length > 0,
    palavrasTriagemCount: palavrasTriagem.length,
    maxPaginasConfigurado: maxPaginas,
  }
}

/**
 * Preview PNCP. Por padrão só a 1ª página (rápido). Com `escaneamentoCompleto`, igual ao import até max páginas.
 */
export async function probePncpFonte(input: {
  endpointBase: string | null
  configuracao: unknown
  fetchImpl?: typeof fetch
  escaneamentoCompleto?: boolean
}): Promise<PncpProbeResult> {
  let urlConsultada = ''
  try {
    const escaneamentoCompleto = input.escaneamentoCompleto === true
    const r = await executarConsultaPncpPaginada({
      endpointBase: input.endpointBase,
      configuracao: input.configuracao,
      fetchImpl: input.fetchImpl,
      apenasPrimeiraPagina: !escaneamentoCompleto,
    })
    urlConsultada = r.urlPrimeiraPagina
    return {
      ok: true,
      totalRegistros: r.totalRegistrosCatalogo,
      registrosNaPrimeiraPagina: r.primeiraPaginaFiltrados,
      ...(r.triagemObjetoAtiva ? { registrosNaPrimeiraPaginaBruta: r.primeiraPaginaBrutos } : {}),
      totalPaginas: r.totalPaginasApi,
      modo: r.modo,
      dataInicial: r.dataInicial,
      dataFinal: r.dataFinal,
      urlConsultada: r.urlPrimeiraPagina,
      limitePorExecucao: r.limitePorExecucao,
      triagemObjetoAtiva: r.triagemObjetoAtiva,
      palavrasTriagemCount: r.palavrasTriagemCount,
      registrosBrutosNoLote: r.itensBrutosNoLote,
      registrosAposTriagemNoLote: r.registros.length,
      paginasPercorridasNoLote: r.paginasPercorridas,
      escaneamentoLoteCompleto: escaneamentoCompleto,
      maxPaginasFonte: r.maxPaginasConfigurado,
    }
  } catch (e) {
    return {
      ok: false,
      erro: isFetchTimeoutError(e) ? ERRO_PNCP_TIMEOUT_PT : e instanceof Error ? e.message : String(e),
      urlConsultada: urlConsultada || undefined,
    }
  }
}

export function createPncpSource(input: {
  fonteId: string
  endpointBase: string | null
  configuracao: unknown
  fetchImpl?: typeof fetch
}): CaptacaoSource {
  const { endpointBase, configuracao } = input
  const fetchFn = input.fetchImpl ?? fetch

  return {
    tipo: 'pncp',
    async fetch() {
      const r = await executarConsultaPncpPaginada({
        endpointBase,
        configuracao,
        fetchImpl: fetchFn,
      })
      return r.registros
    },
  }
}
