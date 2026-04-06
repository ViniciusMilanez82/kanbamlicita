import {
  getProxyRedirect,
  resolveConfiguracoesTab,
  shouldRenderAppShell,
} from '@/lib/auth/access'

describe('auth access rules', () => {
  describe('getProxyRedirect', () => {
    it('redireciona usuário autenticado de /login para o painel', () => {
      expect(getProxyRedirect('/login', true)).toBe('/dashboard')
    })

    it('redireciona visitante sem sessão de rota privada para /login', () => {
      expect(getProxyRedirect('/kanban', false)).toBe('/login')
    })

    it('não redireciona chamadas de api sem sessão', () => {
      expect(getProxyRedirect('/api/usuarios-ativos', false)).toBeNull()
    })

    it('não redireciona visitante sem sessão ao acessar /login', () => {
      expect(getProxyRedirect('/login', false)).toBeNull()
    })
  })

  describe('shouldRenderAppShell', () => {
    it('não renderiza sidebar na tela de login', () => {
      expect(shouldRenderAppShell('/login')).toBe(false)
    })

    it('renderiza shell nas áreas internas', () => {
      expect(shouldRenderAppShell('/kanban')).toBe(true)
    })
  })

  describe('resolveConfiguracoesTab', () => {
    it('mantém aba admin para admin', () => {
      expect(resolveConfiguracoesTab('usuarios', true)).toBe('usuarios')
    })

    it('força perfil quando usuário comum tenta aba admin', () => {
      expect(resolveConfiguracoesTab('sistema', false)).toBe('perfil')
    })

    it('usa perfil como fallback para aba inválida', () => {
      expect(resolveConfiguracoesTab('inexistente', true)).toBe('perfil')
    })
  })
})
