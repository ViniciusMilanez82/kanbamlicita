export const SISTEMA_PAINEIS = ['origem', 'captacao', 'notas', 'checklists', 'parecer', 'templates', 'servidor'] as const
export type SistemaPainel = (typeof SISTEMA_PAINEIS)[number]

export function resolveSistemaPainel(p: string | null | undefined): SistemaPainel {
  return SISTEMA_PAINEIS.includes(p as SistemaPainel) ? (p as SistemaPainel) : 'origem'
}

/** Query string para abrir direto o painel de fontes PNCP. */
export const CONFIG_SISTEMA_ORIGEM_HREF = '/configuracoes?tab=sistema&painel=origem' as const

/** Painel de quais campos da licitação são preenchidos na importação PNCP. */
export const CONFIG_SISTEMA_CAPTACAO_HREF = '/configuracoes?tab=sistema&painel=captacao' as const
