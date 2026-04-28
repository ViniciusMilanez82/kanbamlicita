'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, CloudDownload, Loader2, Radio, Search, Settings } from 'lucide-react'
import { PncpFonteFiltrosFields } from '@/components/captacao/PncpFonteFiltrosFields'
import { salvarFiltrosPncpNaFonteApi } from '@/lib/captacao/pncp-fonte-api-client'
import { configToPncpForm, type PncpFiltrosForm } from '@/lib/captacao/pncp-ui-config'
import { CONFIG_SISTEMA_CAPTACAO_HREF, CONFIG_SISTEMA_ORIGEM_HREF } from '@/lib/config/configuracoes-sistema-ui'

type Fonte = {
  id: string
  nome: string
  tipo: string
  endpointBase: string | null
  ativo: boolean
  ultimaSincronizacao: string | null
  configuracao?: unknown
}

export function ImportarLicitacoesPanel() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [fontes, setFontes] = useState<Fonte[] | null>(null)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [criandoPncp, setCriandoPncp] = useState(false)
  const [fonteIdAtiva, setFonteIdAtiva] = useState<string | null>(null)
  const [passo1, setPasso1] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle')
  const [passo2, setPasso2] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle')
  const [msgBusca, setMsgBusca] = useState<string | null>(null)
  const [msgImport, setMsgImport] = useState<string | null>(null)
  /** Import concluiu sem itens no lote (triagem / vazio) — mensagem em âmbar e sem CTA Kanban. */
  const [importSemLote, setImportSemLote] = useState(false)
  /** Só ative se precisar somar todas as páginas antes de importar — muitas chamadas ao PNCP. */
  const [buscaLoteCompleto, setBuscaLoteCompleto] = useState(false)
  const [filtros, setFiltros] = useState<PncpFiltrosForm>(() => ({
    uf: '',
    palavrasChaveObjeto: '',
    diasJanela: '7',
    maxPaginas: '20',
  }))

  const carregar = useCallback(async () => {
    setErroLista(null)
    try {
      const res = await fetch('/api/admin/fontes')
      if (!res.ok) throw new Error('Não foi possível carregar as fontes.')
      const { fontes: f } = await res.json() as { fontes: Fonte[] }
      setFontes(f)
      const pncp = f.filter((x) => x.tipo === 'pncp')
      const escolhida = pncp.find((x) => x.ativo) ?? pncp[0] ?? null
      setFonteIdAtiva(escolhida?.id ?? null)
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : 'Erro ao carregar.')
      setFontes([])
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const fontesPncp = (fontes ?? []).filter((f) => f.tipo === 'pncp')
  const fonteSelecionada = fontesPncp.find((f) => f.id === fonteIdAtiva) ?? fontesPncp[0]

  useEffect(() => {
    if (!fonteSelecionada?.id) return
    setFiltros(configToPncpForm(fonteSelecionada.configuracao))
    // Re-seed filtros apenas quando troca de fonte; configuracao da mesma fonte é gerenciada localmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonteSelecionada?.id])

  async function persistirFiltrosNaFonte(): Promise<void> {
    if (!fonteSelecionada?.id) return
    const fonte = await salvarFiltrosPncpNaFonteApi<Fonte>(
      fonteSelecionada.id,
      fonteSelecionada.configuracao,
      filtros
    )
    setFontes((prev) =>
      prev ? prev.map((x) => (x.id === fonte.id ? { ...x, ...fonte, configuracao: fonte.configuracao } : x)) : prev
    )
  }

  async function garantirPncp() {
    setCriandoPncp(true)
    setErroLista(null)
    try {
      const res = await fetch('/api/admin/fontes/ensure-pncp', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Falha ao preparar conexão.')
      await carregar()
      setFonteIdAtiva(body.fonte?.id ?? null)
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : 'Erro.')
    } finally {
      setCriandoPncp(false)
    }
  }

  async function ativarFonte(id: string) {
    const res = await fetch(`/api/admin/fontes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: true }),
    })
    if (res.ok) await carregar()
  }

  async function buscarDisponiveis() {
    if (!fonteSelecionada?.id) return
    setPasso1('loading')
    setMsgBusca(null)
    setMsgImport(null)
    setPasso2('idle')
    try {
      try {
        await persistirFiltrosNaFonte()
      } catch (e) {
        setMsgBusca(e instanceof Error ? e.message : 'Erro ao gravar filtros.')
        setPasso1('erro')
        return
      }
      const probeQs = buscaLoteCompleto ? '?loteCompleto=1' : ''
      const res = await fetch(`/api/admin/fontes/${fonteSelecionada.id}/probe${probeQs}`)
      const body = await res.json() as {
        ok?: boolean
        erro?: string
        totalRegistros?: number
        registrosNaPrimeiraPagina?: number
        registrosNaPrimeiraPaginaBruta?: number
        totalPaginas?: number
        limitePorExecucao?: number
        triagemObjetoAtiva?: boolean
        palavrasTriagemCount?: number
        registrosBrutosNoLote?: number
        registrosAposTriagemNoLote?: number
        paginasPercorridasNoLote?: number
        escaneamentoLoteCompleto?: boolean
        maxPaginasFonte?: number
        error?: string
      }
      if (!res.ok) throw new Error(body.erro ?? body.error ?? 'Falha na consulta')
      if (body.ok === false && body.erro) throw new Error(body.erro)
      if (body.ok !== true) throw new Error('Resposta inválida')
      const total = body.totalRegistros ?? 0
      const lim = body.limitePorExecucao
      const limTxt = typeof lim === 'number' ? lim.toLocaleString('pt-BR') : '—'
      const triagem = body.triagemObjetoAtiva
      const bruta = body.registrosNaPrimeiraPaginaBruta
      const depoisTriagem = body.registrosNaPrimeiraPagina ?? 0
      const nPag = body.paginasPercorridasNoLote ?? 1
      const brutosLote = body.registrosBrutosNoLote ?? depoisTriagem
      const aposLote = body.registrosAposTriagemNoLote ?? depoisTriagem
      const completo = body.escaneamentoLoteCompleto === true
      const maxPagFonte =
        body.maxPaginasFonte ?? (Number.parseInt(String(filtros.maxPaginas ?? ''), 10) || 20)

      const linhaPortal = `(1) Total no portal com o filtro da API: ${total.toLocaleString('pt-BR')} licitação(ões). Esse número é só referência do PNCP — não é quanto vai para o Kanban de uma vez.`

      const linhaKanbanLote = triagem
        ? `(2) Para o Kanban no próximo «Trazer»: no máximo ${limTxt} registro(s) nesta execução, contando só os que passarem na triagem por objeto (${body.palavrasTriagemCount ?? 0} termo(s)). Cada um pode virar card novo ou atualizar um existente em «Captadas automaticamente».`
        : `(2) Para o Kanban no próximo «Trazer»: no máximo ${limTxt} registro(s) nesta execução (sem triagem por texto — entram os itens das páginas consultadas, até esse teto).`

      const linhaPrevia = completo
        ? triagem && typeof bruta === 'number'
          ? `(3) Lote completo escaneado: ${nPag} página(s) (como «Trazer»). Soma: ${brutosLote} brutos → ${aposLote} após triagem; o passo 2 processa até ${aposLote} (teto ${limTxt}). 1ª página: ${bruta} brutos → ${depoisTriagem} após triagem.`
          : `(3) Lote completo: ${nPag} página(s); ${aposLote} item(ns) no total no próximo «Trazer» (teto ${limTxt}). 1ª página: ${depoisTriagem} item(ns).`
        : triagem && typeof bruta === 'number'
          ? `(3) Busca rápida: só a 1ª página (${nPag} chamada ao PNCP). Totais abaixo são só dela; «Trazer» percorre até ${maxPagFonte} página(s). Marque «Escanear lote completo» para somar tudo (mais lento). Nesta página: ${brutosLote} brutos → ${aposLote} após triagem.`
          : `(3) Busca rápida: 1ª página (${nPag} chamada). ${aposLote} item(ns) nela; «Trazer» usa até ${maxPagFonte} página(s).`

      const avisoTriagemZerou = triagem && brutosLote > 0 && aposLote === 0
      const linhaAviso = avisoTriagemZerou
        ? completo
          ? ` Atenção: a triagem eliminou todos os itens do lote escaneado — ajuste «palavras no objeto» antes do passo 2.`
          : ` Atenção: nesta 1ª página a triagem zerou; outras páginas podem ter matches — marque «Escanear lote completo» ou use «Trazer».`
        : ''

      setMsgBusca(
        total === 0
          ? 'Neste momento não há licitações no filtro atual (período, modalidade, UF etc.). Ajuste UF, palavras no objeto e janela nos campos acima e busque de novo.'
          : [linhaPortal, linhaKanbanLote, `${linhaPrevia}${linhaAviso}`].join('\n\n')
      )
      setPasso1('ok')
    } catch (e) {
      setMsgBusca(e instanceof Error ? e.message : 'Erro ao consultar.')
      setPasso1('erro')
    }
  }

  async function importar() {
    if (!fonteSelecionada?.id) return
    setPasso2('loading')
    setMsgImport(null)
    try {
      try {
        await persistirFiltrosNaFonte()
      } catch (e) {
        setMsgImport(e instanceof Error ? e.message : 'Erro ao gravar filtros.')
        setPasso2('erro')
        return
      }
      const res = await fetch(`/api/admin/fontes/${fonteSelecionada.id}/sync`, { method: 'POST' })
      const body = await res.json() as {
        error?: string
        message?: string
        status?: string
        totalLidos?: number
        totalNovos?: number
        totalAtualizados?: number
      }
      if (!res.ok || body.status === 'erro') {
        throw new Error(body.error ?? body.message ?? 'Falha na importação')
      }
      const lidos = body.totalLidos ?? 0
      const palavrasTri = filtros.palavrasChaveObjeto.trim()
      if (lidos === 0) {
        setImportSemLote(true)
        setMsgImport(
          palavrasTri
            ? `Nenhum item passou na triagem por objeto com os termos atuais («${palavrasTri}»). O portal pode mostrar centenas no filtro da API, mas só entram no Kanban os registros cujo texto (objeto e campos relacionados) contém pelo menos um desses termos. Esvazie «palavras no objeto» para importar o lote sem esse filtro, ou ajuste os termos e use Buscar de novo.`
            : 'Nenhum registro retornado nesta execução (resposta vazia nas páginas consultadas ou filtro da API muito restritivo).'
        )
        setPasso2('ok')
      } else {
        setImportSemLote(false)
        const avisoSemPalavras =
          !filtros.palavrasChaveObjeto.trim() && !filtros.uf.trim()
            ? ' Sem UF nem palavras-chave, a API devolve o volume máximo do lote (até o limite de páginas).'
            : !filtros.palavrasChaveObjeto.trim()
              ? ' Sem palavras no objeto, não há triagem por texto — só UF, janela e modalidade.'
              : ''
        setMsgImport(
          `Pronto: ${lidos} processado(s), ${body.totalNovos ?? 0} novo(s), ${body.totalAtualizados ?? 0} atualizado(s). Os cards aparecem na coluna «Captadas automaticamente».${avisoSemPalavras}`
        )
        setPasso2('ok')
      }
      await carregar()
      await queryClient.invalidateQueries({ queryKey: ['licitacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['kanban-metricas'] })
      router.refresh()
    } catch (e) {
      setImportSemLote(false)
      setMsgImport(e instanceof Error ? e.message : 'Erro ao importar.')
      setPasso2('erro')
    }
  }

  if (fontes === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Carregando…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Como funciona</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            <strong className="text-slate-800">Buscar</strong> — por padrão só a 1ª página (rápido, menos 500 no PNCP).
            Opcionalmente escaneia o lote inteiro. Mostra total no portal, teto do «Trazer» e contagem brutos / após triagem
            na amostra ou no lote completo.
          </li>
          <li>
            <strong className="text-slate-800">Trazer</strong> — importa um <strong className="font-medium">lote</strong>{' '}
            limitado para a coluna «Captadas automaticamente». Volume grande no portal exige estreitar UF, palavras no
            objeto e janela de dias (campos abaixo) antes de encher o funil.
          </li>
        </ol>
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          Tudo o que for «configuração do produto» (fontes, filtros salvos, notas do Kanban, textos do parecer) está no menu{' '}
          <Link href="/configuracoes" className="font-medium text-blue-700 underline hover:text-blue-900">
            Configurações
          </Link>
          . Esta tela é só o passo a passo para buscar e trazer do PNCP.
        </p>
      </div>

      {erroLista && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erroLista}</p>
      )}

      {fontesPncp.length === 0 && (
        <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 p-6 text-center">
          <Radio className="mx-auto h-10 w-10 text-blue-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">Conectar ao PNCP</p>
          <p className="mt-1 text-sm text-slate-600">
            Um clique cria a ligação oficial com o governo. Você não precisa colar URL nem token.
          </p>
          <button
            type="button"
            onClick={() => void garantirPncp()}
            disabled={criandoPncp}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {criandoPncp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {criandoPncp ? 'Conectando…' : 'Conectar agora'}
          </button>
        </div>
      )}

      {fonteSelecionada && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fonte</p>
              <p className="font-medium text-slate-900">{fonteSelecionada.nome}</p>
            </div>
            {!fonteSelecionada.ativo && (
              <button
                type="button"
                onClick={() => void ativarFonte(fonteSelecionada.id)}
                className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200"
              >
                Ativar fonte
              </button>
            )}
          </div>

          {fontesPncp.length > 1 && (
            <label className="block text-sm">
              <span className="text-slate-600">Outra fonte PNCP:</span>
              <select
                value={fonteIdAtiva ?? ''}
                onChange={(e) => setFonteIdAtiva(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {fontesPncp.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.ativo ? '' : '(desligada)'}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold text-slate-700">Filtros PNCP</p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Espelho do que está em{' '}
              <Link href={CONFIG_SISTEMA_ORIGEM_HREF} className="font-medium text-blue-700 underline hover:text-blue-900">
                Configurações → Origem dos dados
              </Link>
              . Ao buscar ou importar, os valores são <strong className="font-medium text-slate-800">gravados na fonte</strong>{' '}
              antes da chamada à API.
            </p>
            <PncpFonteFiltrosFields
              idPrefix={`importar-${fonteSelecionada.id}`}
              value={filtros}
              onChange={setFiltros}
              density="comfortable"
            />
            <p className="text-[11px] leading-relaxed text-slate-600">
              O que <strong className="font-medium text-slate-800">gravar</strong> em cada licitação (objeto, órgão, UF,
              valor…):{' '}
              <Link
                href={CONFIG_SISTEMA_CAPTACAO_HREF}
                className="font-medium text-blue-700 underline hover:text-blue-900"
              >
                Configurações → Campos na importação
              </Link>
              .
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-amber-50/40 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={buscaLoteCompleto}
              onChange={(e) => setBuscaLoteCompleto(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
            />
            <span>
              <span className="font-medium text-slate-800">Escanear lote completo</span> — consulta todas as páginas até
              o máx. configurado (igual ao «Trazer»). Útil para totais exatos, mas{' '}
              <span className="font-medium">multiplica chamadas ao PNCP</span> e pode falhar se o portal estiver instável.
              Padrão desligado: só a 1ª página + retentativas automáticas em erro 5xx.
            </span>
          </label>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">Passo 1</p>
            <button
              type="button"
              onClick={() => void buscarDisponiveis()}
              disabled={!fonteSelecionada.ativo || passo1 === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm hover:border-blue-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passo1 === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <Search className="h-5 w-5 text-blue-600" />
              )}
              Buscar licitações disponíveis
            </button>
            {msgBusca && (
              <div
                className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${
                  passo1 === 'ok' ? 'bg-emerald-50 text-emerald-900' : passo1 === 'erro' ? 'bg-red-50 text-red-900' : 'bg-slate-50 text-slate-700'
                }`}
              >
                {passo1 === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />}
                <span className="min-w-0 whitespace-pre-line leading-relaxed">{msgBusca}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">Passo 2</p>
            <button
              type="button"
              onClick={() => void importar()}
              disabled={!fonteSelecionada.ativo || passo2 === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-4 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passo2 === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CloudDownload className="h-5 w-5" />
              )}
              Trazer para o Kanban
            </button>
            {msgImport && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  passo2 === 'erro'
                    ? 'bg-red-50 text-red-900'
                    : importSemLote
                      ? 'bg-amber-50 text-amber-950'
                      : 'bg-emerald-50 text-emerald-900'
                }`}
              >
                {msgImport}
              </div>
            )}
          </div>

          {passo2 === 'ok' && !importSemLote && (
            <Link
              href="/kanban"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Abrir o Kanban
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center text-xs text-slate-500">
        <p className="flex flex-wrap items-center justify-center gap-2">
          <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <Link href={CONFIG_SISTEMA_ORIGEM_HREF} className="underline hover:text-slate-700">
            Filtros e histórico: Configurações → Origem dos dados
          </Link>
        </p>
        <p>
          <Link href={CONFIG_SISTEMA_CAPTACAO_HREF} className="underline hover:text-slate-700">
            Campos importados do PNCP (objeto, órgão…)
          </Link>
        </p>
      </div>
    </div>
  )
}
