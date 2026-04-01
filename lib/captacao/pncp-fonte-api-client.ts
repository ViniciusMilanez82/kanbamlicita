import { mergeSalvarPncp, type PncpFiltrosForm } from './pncp-ui-config'

/** PATCH `configuracao` na fonte (admin). Lança `Error` se a API falhar. */
export async function salvarFiltrosPncpNaFonteApi<TFonte = unknown>(
  fonteId: string,
  configuracaoAtual: unknown,
  filtros: PncpFiltrosForm
): Promise<TFonte> {
  const configuracao = mergeSalvarPncp(configuracaoAtual, filtros)
  const res = await fetch(`/api/admin/fontes/${fonteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configuracao }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? 'Falha ao salvar filtros da fonte.')
  }
  return (body as { fonte: TFonte }).fonte
}
