'use client'

import { useState } from 'react'
import { calcularScore, faixa } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'
import type { ScoreDetalhe, AnaliseDetalhe, AnaliseIaDetalhe } from '@/types/licitacao-detalhe'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

type Props = {
  licitacaoId: string
  score: ScoreDetalhe
  analise: AnaliseDetalhe
  analiseIa: AnaliseIaDetalhe
  configPesos: ConfigPesos
  configFaixas: ConfigFaixas
}

const FALSO_NEGATIVO_MOTIVOS = [
  'titulo_generico',
  'objeto_amplo_demais',
  'sem_tr_publicado',
  'criterio_julgamento_ambiguo',
  'lote_misto_heterogeneo',
  'itens_sem_descricao',
  'planilha_incompleta',
  'memorial_ausente',
  'requisitos_habilitacao_restritivos',
  'prazo_curto_para_proposta',
  'historico_direcionamento',
  'exigencia_tecnica_incomum',
]

export function ScoreTab({ licitacaoId, score, analise, analiseIa, configPesos, configFaixas }: Props) {
  const [aderenciaDireta, setAderenciaDireta] = useState(score?.scoreAderenciaDireta ?? 0)
  const [aderenciaAplicacao, setAderenciaAplicacao] = useState(score?.scoreAderenciaAplicacao ?? 0)
  const [contextoOculto, setContextoOculto] = useState(score?.scoreContextoOculto ?? 0)
  const [modeloComercial, setModeloComercial] = useState(score?.scoreModeloComercial ?? 0)
  const [potencialEconomico, setPotencialEconomico] = useState(score?.scorePotencialEconomico ?? 0)
  const [qualidadeEvidencia, setQualidadeEvidencia] = useState(score?.scoreQualidadeEvidencia ?? 0)
  const [justificativa, setJustificativa] = useState(score?.scoreJustificativaResumida ?? '')

  const [foiPossivelEstimar, setFoiPossivelEstimar] = useState(score?.valorCapturavelFoiPossivelEstimar ?? false)
  const [valorEstimado, setValorEstimado] = useState(score?.valorCapturavelEstimado?.toString() ?? '')
  const [faixaMin, setFaixaMin] = useState(score?.valorCapturavelFaixaMin?.toString() ?? '')
  const [faixaMax, setFaixaMax] = useState(score?.valorCapturavelFaixaMax?.toString() ?? '')
  const [moeda, setMoeda] = useState(score?.valorCapturavelMoeda ?? 'BRL')
  const [nivelConfianca, setNivelConfianca] = useState(score?.valorCapturavelNivelConfianca ?? 'baixo')
  const [metodoEstimativa, setMetodoEstimativa] = useState(score?.valorCapturavelMetodoEstimativa ?? 'nao_estimado')
  const [justificativaValor, setJustificativaValor] = useState(score?.valorCapturavelJustificativa ?? '')
  const [observacaoValor, setObservacaoValor] = useState(score?.valorCapturavelObservacao ?? '')

  const [existeRisco, setExisteRisco] = useState(score?.falsoNegativoExisteRisco ?? false)
  const [nivelRisco, setNivelRisco] = useState(score?.falsoNegativoNivelRisco ?? 'baixo')
  const [motivosSelecionados, setMotivosSelecionados] = useState<string[]>(
    (score?.falsoNegativoMotivos as string[]) ?? []
  )
  const [resumoFn, setResumoFn] = useState(score?.falsoNegativoResumo ?? '')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const scoreFinal =
    (aderenciaDireta * configPesos.aderenciaDireta +
      aderenciaAplicacao * configPesos.aderenciaAplicacao +
      contextoOculto * configPesos.contextoOculto +
      modeloComercial * configPesos.modeloComercial +
      potencialEconomico * configPesos.potencialEconomico +
      qualidadeEvidencia * configPesos.qualidadeEvidencia) /
    100

  function handleSugerir() {
    const iaResult =
      analiseIa?.status === 'CONCLUIDO'
        ? (analiseIa.resultadoJson as AnaliseIaResult)
        : null
    const sugestao = calcularScore(analise, iaResult, configPesos, configFaixas)
    setAderenciaDireta(sugestao.scoreAderenciaDireta)
    setAderenciaAplicacao(sugestao.scoreAderenciaAplicacao)
    setContextoOculto(sugestao.scoreContextoOculto)
    setModeloComercial(Math.round(sugestao.scoreModeloComercial))
    setPotencialEconomico(sugestao.scorePotencialEconomico)
    setQualidadeEvidencia(sugestao.scoreQualidadeEvidencia)
  }

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreAderenciaDireta: aderenciaDireta,
          scoreAderenciaAplicacao: aderenciaAplicacao,
          scoreContextoOculto: contextoOculto,
          scoreModeloComercial: modeloComercial,
          scorePotencialEconomico: potencialEconomico,
          scoreQualidadeEvidencia: qualidadeEvidencia,
          scoreFinal: Math.round(scoreFinal * 100) / 100,
          faixaClassificacao: faixa(scoreFinal, configFaixas),
          scoreJustificativaResumida: justificativa || null,
          valorCapturavelObrigatorioPreenchido: true,
          valorCapturavelFoiPossivelEstimar: foiPossivelEstimar,
          valorCapturavelEstimado: foiPossivelEstimar && valorEstimado ? Number(valorEstimado) : null,
          valorCapturavelFaixaMin: faixaMin ? Number(faixaMin) : null,
          valorCapturavelFaixaMax: faixaMax ? Number(faixaMax) : null,
          valorCapturavelMoeda: moeda,
          valorCapturavelNivelConfianca: nivelConfianca,
          valorCapturavelMetodoEstimativa: metodoEstimativa,
          valorCapturavelJustificativa: justificativaValor,
          valorCapturavelBaseDocumental: [],
          valorCapturavelObservacao: observacaoValor || null,
          falsoNegativoObrigatorioPreenchido: true,
          falsoNegativoExisteRisco: existeRisco,
          falsoNegativoNivelRisco: nivelRisco,
          falsoNegativoMotivos: motivosSelecionados,
          falsoNegativoTrechosCriticos: [],
          falsoNegativoResumo: resumoFn,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Score salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function toggleMotivo(motivo: string) {
    setMotivosSelecionados((prev) =>
      prev.includes(motivo) ? prev.filter((m) => m !== motivo) : [...prev, motivo]
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Bloco 1 — Score por componentes */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Score por Componentes</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Aderência Direta (×15)', value: aderenciaDireta, set: setAderenciaDireta },
            { label: 'Aderência Aplicação (×25)', value: aderenciaAplicacao, set: setAderenciaAplicacao },
            { label: 'Contexto Oculto (×20)', value: contextoOculto, set: setContextoOculto },
            { label: 'Modelo Comercial (×15)', value: modeloComercial, set: setModeloComercial },
            { label: 'Potencial Econômico IA (×15)', value: potencialEconomico, set: setPotencialEconomico },
            { label: 'Qualidade Evidência IA (×10)', value: qualidadeEvidencia, set: setQualidadeEvidencia },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => set(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Score final: <strong>{Math.round(scoreFinal * 100) / 100}</strong> — Faixa: <strong>{faixa(scoreFinal, configFaixas)}</strong>
          </span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Justificativa resumida</span>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSugerir}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
          >
            Sugerir
          </button>
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </section>

      {/* Bloco 2 — Valor capturável */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Valor Capturável</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={foiPossivelEstimar}
            onChange={(e) => setFoiPossivelEstimar(e.target.checked)}
          />
          Foi possível estimar?
        </label>
        {foiPossivelEstimar && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Valor estimado</span>
            <input
              type="number"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
        )}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Faixa mín.</span>
            <input
              type="number"
              value={faixaMin}
              onChange={(e) => setFaixaMin(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Faixa máx.</span>
            <input
              type="number"
              value={faixaMax}
              onChange={(e) => setFaixaMax(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Moeda</span>
            <select
              value={moeda}
              onChange={(e) => setMoeda(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Nível confiança</span>
            <select
              value={nivelConfianca}
              onChange={(e) => setNivelConfianca(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Método</span>
            <select
              value={metodoEstimativa}
              onChange={(e) => setMetodoEstimativa(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="por_item_planilhado">Por item planilhado</option>
              <option value="por_quantitativo_x_preco_referencia">Por quantitativo × preço ref.</option>
              <option value="por_lote_relacionado">Por lote relacionado</option>
              <option value="por_inferencia_de_escopo">Por inferência de escopo</option>
              <option value="nao_estimado">Não estimado</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Justificativa</span>
          <textarea
            value={justificativaValor}
            onChange={(e) => setJustificativaValor(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Observação</span>
          <textarea
            value={observacaoValor}
            onChange={(e) => setObservacaoValor(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
      </section>

      {/* Bloco 3 — Falso negativo */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Falso Negativo</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={existeRisco}
            onChange={(e) => setExisteRisco(e.target.checked)}
          />
          Existe risco de falso negativo?
        </label>
        {existeRisco && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Nível do risco</span>
            <select
              value={nivelRisco}
              onChange={(e) => setNivelRisco(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
            >
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          {FALSO_NEGATIVO_MOTIVOS.map((motivo) => (
            <label key={motivo} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={motivosSelecionados.includes(motivo)}
                onChange={() => toggleMotivo(motivo)}
              />
              {motivo.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Resumo</span>
          <textarea
            value={resumoFn}
            onChange={(e) => setResumoFn(e.target.value)}
            rows={2}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
          />
        </label>
      </section>
    </div>
  )
}
