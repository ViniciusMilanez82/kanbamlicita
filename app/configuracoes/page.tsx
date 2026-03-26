import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/TopBar'
import { PerfilTab } from '@/components/configuracoes/PerfilTab'
import { UsuariosTab } from '@/components/configuracoes/UsuariosTab'
import { SistemaTab } from '@/components/configuracoes/SistemaTab'
import { PESOS_PADRAO, FAIXAS_PADRAO } from '@/lib/score/calculator'
import type { ConfigPesos, ConfigFaixas } from '@/lib/score/calculator'

const VALID_TABS = ['perfil', 'usuarios', 'sistema'] as const
type Tab = typeof VALID_TABS[number]

type PageProps = {
  searchParams: Promise<{ tab?: string }>
}

export default async function ConfiguracoesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { tab } = await searchParams
  const isAdmin = session.user.role === 'admin'

  // Redirecionar abas admin para perfil se não for admin
  let activeTab: Tab = (VALID_TABS.includes(tab as Tab) ? tab : 'perfil') as Tab
  if (!isAdmin && (activeTab === 'usuarios' || activeTab === 'sistema')) {
    activeTab = 'perfil'
  }

  // Carregar dados conforme a aba ativa
  const [user, config, usuarios, fontes] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id as string },
      select: { name: true, email: true },
    }),
    isAdmin ? db.configuracaoSistema.findUnique({ where: { id: 'default' } }) : null,
    isAdmin && activeTab === 'usuarios'
      ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, ativo: true, criadoEm: true }, orderBy: { criadoEm: 'asc' } })
      : [],
    isAdmin && activeTab === 'sistema'
      ? db.captacaoFonte.findMany({ select: { id: true, nome: true, tipo: true, endpointBase: true, ativo: true, ultimaSincronizacao: true }, orderBy: { criadoEm: 'asc' } })
      : [],
  ])

  const configPesos = (config?.pesosScore ?? PESOS_PADRAO) as ConfigPesos
  const configFaixas = (config?.faixasScore ?? FAIXAS_PADRAO) as ConfigFaixas
  const segmentos = (config?.segmentos ?? []) as string[]
  const listasParecerTab = (config?.listasParecerTab ?? {
    ondeEstaOportunidade: [], solucoesQueMultiteinerPoderiaOfertar: [],
    proximoPasosRecomendado: [], riscosLimitacoes: [], evidenciasPrincipais: [],
  }) as { ondeEstaOportunidade: string[]; solucoesQueMultiteinerPoderiaOfertar: string[]; proximoPasosRecomendado: string[]; riscosLimitacoes: string[]; evidenciasPrincipais: string[] }

  const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'usuarios', label: 'Usuários', adminOnly: true },
    { key: 'sistema', label: 'Sistema', adminOnly: true },
  ]

  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Barra de abas */}
        <div className="flex border-b border-slate-200 bg-white px-4">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <a
              key={t.key}
              href={`/configuracoes?tab=${t.key}`}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'perfil' && (
            <PerfilTab
              initialName={user?.name ?? ''}
              email={user?.email ?? ''}
            />
          )}
          {activeTab === 'usuarios' && isAdmin && (
            <UsuariosTab
              initialUsuarios={(usuarios as Array<{ id: string; name: string | null; email: string; role: string; ativo: boolean; criadoEm: Date }>).map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() }))}
              currentUserId={session.user.id as string}
            />
          )}
          {activeTab === 'sistema' && isAdmin && (
            <SistemaTab
              initialPesos={configPesos}
              initialFaixas={configFaixas}
              initialSegmentos={segmentos}
              initialListasParecerTab={listasParecerTab}
              initialFontes={fontes.map((f) => ({
                ...f,
                ultimaSincronizacao: f.ultimaSincronizacao?.toISOString() ?? null,
              }))}
            />
          )}
        </div>
      </div>
    </>
  )
}
