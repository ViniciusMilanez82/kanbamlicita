// app/login/LoginForm.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    // redirect: false to capture error before redirecting
    // (spec uses redirectTo directly, but this approach allows showing error messages)
    const result = await signIn('credentials', {
      email,
      senha,
      redirect: false,
    })

    if (result?.error) {
      setErro('Email ou senha incorretos')
      setLoading(false)
      return
    }

    // router.push doesn't update server-side session — full reload necessary
    window.location.href = '/kanban'
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="senha" className="text-sm font-medium text-slate-700">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
          className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {erro && (
        <p className="text-sm text-red-600">{erro}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
