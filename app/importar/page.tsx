import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { TopBar } from '@/components/layout/TopBar'
import { ImportarLicitacoesPanel } from '@/components/importar/ImportarLicitacoesPanel'

export default async function ImportarPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = session.user.role === 'admin'

  return (
    <>
      <TopBar title="Importar licitações" />
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {isAdmin ? (
          <ImportarLicitacoesPanel />
        ) : (
          <div className="mx-auto max-w-md px-4 py-16 text-center">
            <p className="text-slate-700">
              Somente administradores podem importar licitações do PNCP. Peça a um admin da equipe ou use o Kanban com
              os dados já existentes.
            </p>
            <Link
              href="/kanban"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Voltar ao Kanban
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
