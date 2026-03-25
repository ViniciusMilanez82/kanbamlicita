'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AnaliseIaDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

type Props = {
  licitacaoId: string
  analiseIa: AnaliseIaDetalhe
}

const RECOMENDACAO_COLORS: Record<string, string> = {
  AVANCAR: 'bg-green-100 text-green-800 border-green-200',
  ACOMPANHAR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DESCARTAR: 'bg-red-100 text-red-800 border-red-200',
}

export function IaTab({ licitacaoId, analiseIa }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Auto-refresh a cada 3s enquanto em processamento
  useEffect(() => {
    if (analiseIa?.status !== 'EM_PROCESSAMENTO') return
    const timer = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(timer)
  }, [analiseIa?.status, router])

  async function handleAnalisar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/analise-ia`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao iniciar análise')
        return
      }
      router.refresh()
    } catch {
      toast.error('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  // Estado: sem análise
  if (!analiseIa) {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🤖</div>
        <p className="text-sm text-slate-600">Nenhuma análise realizada para esta licitação.</p>
        <Button
          onClick={handleAnalisar}
          disabled={loading}
          className="bg-[#1D4ED8] hover:bg-blue-700 text-white"
        >
          {loading ? 'Iniciando...' : 'Analisar com IA'}
        </Button>
      </div>
    )
  }

  // Estado: processando
  if (analiseIa.status === 'EM_PROCESSAMENTO') {
    return (
      <div className="p-12 flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#1D4ED8] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-700">Analisando com IA...</p>
        <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

  // Estado: erro
  if (analiseIa.status === 'ERRO') {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">❌</div>
        <p className="text-sm font-medium text-slate-700">Falha na análise</p>
        <p className="text-xs text-slate-500 max-w-md">{analiseIa.resumoTexto}</p>
        <Button onClick={handleAnalisar} disabled={loading} variant="outline">
          {loading ? 'Iniciando...' : 'Tentar novamente'}
        </Button>
      </div>
    )
  }

  // Estado: concluído
  const result = analiseIa.resultadoJson as AnaliseIaResult

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Modelo: {analiseIa.modeloUtilizado ?? '—'} · Versão: {analiseIa.promptVersao ?? '—'}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalisar}
          disabled={loading}
          className="h-7 text-xs"
        >
          {loading ? 'Iniciando...' : 'Re-analisar'}
        </Button>
      </div>

      {/* Resumo executivo */}
      <div className="rounded-lg border bg-blue-50 border-blue-100 p-4">
        <p className="text-sm text-slate-700">{result.resumo}</p>
      </div>

      {/* Aderência + Recomendação + Confiança */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Aderência:</span>
          <Badge className="text-xs capitalize">{result.aderencia.nivel}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Recomendação:</span>
          <Badge className={`text-xs border ${RECOMENDACAO_COLORS[result.recomendacao] ?? ''}`}>
            {result.recomendacao}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Confiança:</span>
          <Badge variant="outline" className="text-xs capitalize">
            {result.confianca}
          </Badge>
        </div>
      </div>

      {/* Justificativa */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Justificativa
        </p>
        <p className="text-sm text-slate-700">{result.aderencia.justificativa}</p>
      </div>

      {/* Oportunidades */}
      {result.oportunidades.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Oportunidades
          </p>
          <ul className="space-y-2">
            {result.oportunidades.map((op, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-slate-400 shrink-0">•</span>
                <div>
                  <span className="font-medium text-slate-700">{op.tipo}</span>
                  <span className="text-slate-500"> — {op.descricao}</span>
                  <span className="ml-2 text-xs text-slate-400 italic">({op.forca})</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riscos */}
      {result.riscos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Riscos
          </p>
          <ul className="space-y-1">
            {result.riscos.map((r, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="text-red-400 shrink-0">⚠</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
