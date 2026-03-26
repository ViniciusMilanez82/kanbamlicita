'use client'

import { useState } from 'react'

type Usuario = {
  id: string
  name: string | null
  email: string
  role: string
  ativo: boolean
  criadoEm: string
}

type Props = {
  initialUsuarios: Usuario[]
  currentUserId: string
}

export function UsuariosTab({ initialUsuarios, currentUserId }: Props) {
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newSenha, setNewSenha] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleCreate() {
    setCreating(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, senha: newSenha, role: newRole }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      const { user } = await res.json()
      setUsuarios((prev) => [...prev, user])
      setShowForm(false)
      setNewName('')
      setNewEmail('')
      setNewSenha('')
      setNewRole('user')
    } catch {
      setMsg('Erro ao criar usuário.')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    if (res.ok) {
      const { user } = await res.json()
      setUsuarios((prev) => prev.map((u) => (u.id === id ? user : u)))
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Usuários</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-xs bg-[#1D4ED8] text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : 'Novo usuário'}
        </button>
      </div>

      {showForm && (
        <div className="border border-slate-200 rounded p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Nome</span>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Email</span>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Senha</span>
              <input type="password" value={newSenha} onChange={(e) => setNewSenha(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Role</span>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="px-3 py-1.5 text-sm bg-[#1D4ED8] text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {creating ? 'Criando…' : 'Criar'}
          </button>
          {msg && <p className="text-xs text-red-500">{msg}</p>}
        </div>
      )}

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-2 pr-3">Nome</th>
            <th className="text-left py-2 pr-3">Email</th>
            <th className="text-left py-2 pr-3">Role</th>
            <th className="text-left py-2 pr-3">Status</th>
            <th className="text-left py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-2 pr-3">{u.name ?? '—'}</td>
              <td className="py-2 pr-3 text-slate-500">{u.email}</td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                  {u.role}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {u.ativo ? 'ativo' : 'inativo'}
                </span>
              </td>
              <td className="py-2">
                <button
                  onClick={() => handleToggleAtivo(u.id, u.ativo)}
                  disabled={u.id === currentUserId}
                  className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {u.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
