// app/login/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/kanban')

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">KanbanLicita</h1>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Entrar</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
