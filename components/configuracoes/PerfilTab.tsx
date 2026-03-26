'use client'

import { useState } from 'react'

type Props = {
  initialName: string
  email: string
}

export function PerfilTab({ initialName, email }: Props) {
  const [name, setName] = useState(initialName)
  const [senha, setSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSalvar() {
    setSaving(true)
    setMsg(null)
    try {
      const body: Record<string, string> = { name }
      if (senha) body.senha = senha
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSenha('')
      setMsg('Perfil salvo com sucesso.')
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Meu Perfil</h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Email</span>
        <input
          type="email"
          value={email}
          disabled
          className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50 text-slate-400"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Nome</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Nova senha (deixe em branco para não alterar)</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </div>
  )
}
