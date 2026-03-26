'use client'

import { useState } from 'react'
import type { ParecerDetalhe, ScoreDetalhe } from '@/types/licitacao-detalhe'

type Props = {
  licitacaoId: string
  parecer: ParecerDetalhe
  score: ScoreDetalhe
}

export function ParecerTab({ licitacaoId, parecer, score }: Props) {
  const [classificacaoFinal, setClassificacaoFinal] = useState(
    parecer?.classificacaoFinal ?? score?.faixaClassificacao ?? 'D'
  )
  const [prioridadeComercial, setPrioridadeComercial] = useState(
    parecer?.prioridadeComercial ?? 'baixa'
  )
  const [valeEsforco, setValeEsforco] = useState(parecer?.valeEsforcoComercial ?? false)
  const [recomendacao, setRecomendacao] = useState(parecer?.recomendacaoFinal ?? 'DESCARTAR')
  const [oportunidadeDireta, setOportunidadeDireta] = useState(parecer?.oportunidadeDireta ?? false)
  const [oportunidadeIndireta, setOportunidadeIndireta] = useState(parecer?.oportunidadeIndireta ?? false)
  const [oportunidadeOculta, setOportunidadeOculta] = useState(parecer?.oportunidadeOcultaItemLoteAnexo ?? false)
  const [oportunidadeInexistente, setOportunidadeInexistente] = useState(parecer?.oportunidadeInexistente ?? true)
  const [riscoFalsoPositivo, setRiscoFalsoPositivo] = useState(parecer?.riscoFalsoPositivo ?? 'baixo')
  const [riscoFalsoNegativo, setRiscoFalsoNegativo] = useState(parecer?.riscoFalsoNegativoSoTitulo ?? 'baixo')
  const [resumo, setResumo] = useState(parecer?.resumo ?? '')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Inexistente é mutuamente exclusivo com as outras oportunidades
  function handleOportunidade(
    tipo: 'direta' | 'indireta' | 'oculta' | 'inexistente',
    value: boolean
  ) {
    if (tipo === 'inexistente' && value) {
      setOportunidadeDireta(false)
      setOportunidadeIndireta(false)
      setOportunidadeOculta(false)
      setOportunidadeInexistente(true)
    } else {
      if (value) setOportunidadeInexistente(false)
      if (tipo === 'direta') setOportunidadeDireta(value)
      if (tipo === 'indireta') setOportunidadeIndireta(value)
      if (tipo === 'oculta') setOportunidadeOculta(value)
    }
  }

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/licitacoes/${licitacaoId}/parecer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classificacaoFinal,
          prioridadeComercial,
          valeEsforcoComercial: valeEsforco,
          recomendacaoFinal: recomendacao,
          resumo: resumo || null,
          oportunidadeDireta,
          oportunidadeIndireta,
          oportunidadeOcultaItemLoteAnexo: oportunidadeOculta,
          oportunidadeInexistente,
          riscoFalsoPositivo,
          riscoFalsoNegativoSoTitulo: riscoFalsoNegativo,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Parecer salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Parecer Executivo</h2>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Classificação final</span>
          <select
            value={classificacaoFinal}
            onChange={(e) => setClassificacaoFinal(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {['A+', 'A', 'B', 'C', 'D'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Prioridade comercial</span>
          <select
            value={prioridadeComercial}
            onChange={(e) => setPrioridadeComercial(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={valeEsforco}
          onChange={(e) => setValeEsforco(e.target.checked)}
        />
        Vale esforço comercial?
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Recomendação final</span>
        <select
          value={recomendacao}
          onChange={(e) => setRecomendacao(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
        >
          <option value="AVANCAR">Avançar</option>
          <option value="ACOMPANHAR">Acompanhar</option>
          <option value="DESCARTAR">Descartar</option>
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs text-slate-500 mb-1">Tipo de oportunidade</legend>
        {([
          ['direta', 'Direta', oportunidadeDireta],
          ['indireta', 'Indireta', oportunidadeIndireta],
          ['oculta', 'Oculta (item/lote/anexo)', oportunidadeOculta],
          ['inexistente', 'Inexistente', oportunidadeInexistente],
        ] as const).map(([tipo, label, checked]) => (
          <label key={tipo} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleOportunidade(tipo, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Risco falso positivo</span>
          <select
            value={riscoFalsoPositivo}
            onChange={(e) => setRiscoFalsoPositivo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Risco FN só título</span>
          <select
            value={riscoFalsoNegativo}
            onChange={(e) => setRiscoFalsoNegativo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Resumo</span>
        <textarea
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          rows={4}
          className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </div>
  )
}
