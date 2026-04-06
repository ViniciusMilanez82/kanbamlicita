const PUBLIC_PATHS = new Set(['/login'])

const CONFIG_TABS = ['perfil', 'usuarios', 'sistema'] as const

export type ConfigTab = (typeof CONFIG_TABS)[number]

export function getProxyRedirect(
  pathname: string,
  isAuthenticated: boolean
): string | null {
  if (pathname.startsWith('/api/')) {
    return null
  }

  if (pathname === '/login') {
    return isAuthenticated ? '/dashboard' : null
  }

  if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
    return '/login'
  }

  return null
}

export function shouldRenderAppShell(pathname: string): boolean {
  return !PUBLIC_PATHS.has(pathname)
}

export function resolveConfiguracoesTab(
  tab: string | undefined,
  isAdmin: boolean
): ConfigTab {
  const activeTab = CONFIG_TABS.includes(tab as ConfigTab)
    ? (tab as ConfigTab)
    : 'perfil'

  if (!isAdmin && (activeTab === 'usuarios' || activeTab === 'sistema')) {
    return 'perfil'
  }

  return activeTab
}
