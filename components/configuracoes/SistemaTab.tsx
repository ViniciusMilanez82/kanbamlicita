'use client'

import { useState } from 'react'

type ConfigPesos = {
  aderenciaDireta: number; aderenciaAplicacao: number; contextoOculto: number
  modeloComercial: number; potencialEconomico: number; qualidadeEvidencia: number
}
type ConfigFaixas = { aPlus: number; a: number; b: number; c: number }
type ListasParecerTab = {
  ondeEstaOportunidade: string[]
  solucoesQueMultiteinerPoderiaOfertar: string[]
  proximoPasosRecomendado: string[]
  riscosLimitacoes: string[]
  evidenciasPrincipais: string[]
}
type Fonte = {
  id: string; nome: string; tipo: string; endpointBase: string | null; ativo: boolean; ultimaSincronizacao: string | null
}

type Props = {
  initialPesos: ConfigPesos
  initialFaixas: ConfigFaixas
  initialSegmentos: string[]
  initialListasParecerTab: ListasParecerTab
  initialFontes: Fonte[]
}

function ListaEditor({ label, items, onAdd, onRemove }: {
  label: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
}) {
  const [novoItem, setNovoItem] = useState('')
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-slate-600">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs">
            {item}
            <button onClick={() => onRemove(i)} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
          placeholder="Novo item"
          className="border border-slate-300 rounded px-2 py-1 text-xs"
          onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(novoItem); setNovoItem('') } }} />
        <button onClick={() => { onAdd(novoItem); setNovoItem('') }}
          className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100">
          Adicionar
        </button>
      </div>
    </div>
  )
}

export function SistemaTab({ initialPesos, initialFaixas, initialSegmentos, initialListasParecerTab, initialFontes }: Props) {
  const [pesos, setPesos] = useState(initialPesos)
  const [faixas, setFaixas] = useState(initialFaixas)
  const [segmentos, setSegmentos] = useState(initialSegmentos)
  const [novoSegmento, setNovoSegmento] = useState('')
  const [listas, setListas] = useState(initialListasParecerTab)
  const [fontes, setFontes] = useState(initialFontes)
  const [novaFonteNome, setNovaFonteNome] = useState('')
  const [novaFonteTipo, setNovaFonteTipo] = useState('')
  const [novaFonteEndpoint, setNovaFonteEndpoint] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const somaPesos = Object.values(pesos).reduce((a, b) => a + b, 0)

  async function handleSalvarSistema() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/configuracoes/sistema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesosScore: pesos, faixasScore: faixas, segmentos, listasParecerTab: listas }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg('Configurações salvas com sucesso.')
    } catch {
      setMsg('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleFonte(id: string, ativo: boolean) {
    const res = await fetch(`/api/admin/fontes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    if (res.ok) {
      const { fonte } = await res.json()
      setFontes((prev) => prev.map((f) => (f.id === id ? fonte : f)))
    }
  }

  async function handleCriarFonte() {
    const res = await fetch('/api/admin/fontes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaFonteNome, tipo: novaFonteTipo, endpointBase: novaFonteEndpoint || undefined }),
    })
    if (res.ok) {
      const { fonte } = await res.json()
      setFontes((prev) => [...prev, fonte])
      setNovaFonteNome('')
      setNovaFonteTipo('')
      setNovaFonteEndpoint('')
    }
  }

  function addToLista(key: keyof ListasParecerTab, value: string) {
    if (!value.trim()) return
    setListas((prev) => ({ ...prev, [key]: [...prev[key], value.trim()] }))
  }

  function removeFromLista(key: keyof ListasParecerTab, index: number) {
    setListas((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  const PESOS_LABELS: Record<keyof ConfigPesos, string> = {
    aderenciaDireta: 'Aderência Direta',
    aderenciaAplicacao: 'Aderência Aplicação',
    contextoOculto: 'Contexto Oculto',
    modeloComercial: 'Modelo Comercial',
    potencialEconomico: 'Potencial Econômico',
    qualidadeEvidencia: 'Qualidade Evidência',
  }

  const LISTAS_LABELS: Record<keyof ListasParecerTab, string> = {
    ondeEstaOportunidade: 'Onde está a oportunidade',
    solucoesQueMultiteinerPoderiaOfertar: 'Soluções Multiteiner',
    proximoPasosRecomendado: 'Próximos passos',
    riscosLimitacoes: 'Riscos e limitações',
    evidenciasPrincipais: 'Evidências principais',
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">

      {/* Pesos do Score */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pesos do Score</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(pesos) as (keyof ConfigPesos)[]).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{PESOS_LABELS[key]}</span>
              <input
                type="number" min={0} max={100}
                value={pesos[key]}
                onChange={(e) => setPesos((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
        <p className={`text-xs ${somaPesos === 100 ? 'text-green-600' : 'text-red-500'}`}>
          Soma: {somaPesos} {somaPesos !== 100 && '(deve ser 100)'}
        </p>
      </section>

      {/* Faixas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Faixas de Classificação</h2>
        <div className="grid grid-cols-4 gap-3">
          {(['aPlus', 'a', 'b', 'c'] as (keyof ConfigFaixas)[]).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{key === 'aPlus' ? 'A+ (mín)' : `${key.toUpperCase()} (mín)`}</span>
              <input
                type="number" min={0} max={100}
                value={faixas[key]}
                onChange={(e) => setFaixas((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Segmentos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Segmentos</h2>
        <div className="flex flex-wrap gap-2">
          {segmentos.map((s, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs">
              {s}
              <button onClick={() => setSegmentos((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={novoSegmento} onChange={(e) => setNovoSegmento(e.target.value)}
            placeholder="Novo segmento"
            className="border border-slate-300 rounded px-2 py-1 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { setSegmentos((p) => [...p, novoSegmento]); setNovoSegmento('') } }}
          />
          <button
            onClick={() => { if (novoSegmento.trim()) { setSegmentos((p) => [...p, novoSegmento.trim()]); setNovoSegmento('') } }}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100">
            Adicionar
          </button>
        </div>
      </section>

      {/* Listas do ParecerTab */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Listas do Parecer</h2>
        {(Object.keys(listas) as (keyof ListasParecerTab)[]).map((key) => (
          <ListaEditor
            key={key}
            label={LISTAS_LABELS[key]}
            items={listas[key]}
            onAdd={(v) => addToLista(key, v)}
            onRemove={(i) => removeFromLista(key, i)}
          />
        ))}
      </section>

      {/* Botão salvar sistema */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvarSistema}
          disabled={saving || somaPesos !== 100}
          className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>

      {/* Fontes de Captação */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fontes de Captação</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left py-2 pr-3">Nome</th>
              <th className="text-left py-2 pr-3">Tipo</th>
              <th className="text-left py-2 pr-3">Endpoint</th>
              <th className="text-left py-2 pr-3">Último sync</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => (
              <tr key={f.id} className="border-b border-slate-100">
                <td className="py-2 pr-3">{f.nome}</td>
                <td className="py-2 pr-3 text-slate-500">{f.tipo}</td>
                <td className="py-2 pr-3 text-slate-400 truncate max-w-[150px]">{f.endpointBase ?? '—'}</td>
                <td className="py-2 pr-3 text-slate-400">{f.ultimaSincronizacao ? new Date(f.ultimaSincronizacao).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleToggleFonte(f.id, f.ativo)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${f.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                  >
                    {f.ativo ? 'ativo' : 'inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border border-slate-200 rounded p-3 space-y-2 bg-slate-50">
          <p className="text-xs font-medium text-slate-600">Nova fonte</p>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={novaFonteNome} onChange={(e) => setNovaFonteNome(e.target.value)}
              placeholder="Nome" className="border border-slate-300 rounded px-2 py-1 text-xs" />
            <input type="text" value={novaFonteTipo} onChange={(e) => setNovaFonteTipo(e.target.value)}
              placeholder="Tipo" className="border border-slate-300 rounded px-2 py-1 text-xs" />
            <input type="text" value={novaFonteEndpoint} onChange={(e) => setNovaFonteEndpoint(e.target.value)}
              placeholder="Endpoint (opcional)" className="border border-slate-300 rounded px-2 py-1 text-xs" />
          </div>
          <button onClick={handleCriarFonte}
            className="px-2 py-1 text-xs bg-[#1D4ED8] text-white rounded hover:bg-blue-700">
            Criar fonte
          </button>
        </div>
      </section>
    </div>
  )
}
