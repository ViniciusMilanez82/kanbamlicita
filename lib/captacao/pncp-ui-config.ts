/** Formulário de filtros PNCP (UI) — mesma forma em Configurações e Importar. */

export type PncpFiltrosForm = {
  uf: string
  palavrasChaveObjeto: string
  diasJanela: string
  maxPaginas: string
}

export function configToPncpForm(c: unknown): PncpFiltrosForm {
  const o = c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : {}
  const pal = o.palavrasChaveObjeto
  const palStr = Array.isArray(pal) ? pal.join(', ') : typeof pal === 'string' ? pal : ''
  return {
    uf: typeof o.uf === 'string' ? o.uf : '',
    palavrasChaveObjeto: palStr,
    diasJanela: String(typeof o.diasJanela === 'number' ? o.diasJanela : 7),
    maxPaginas: String(typeof o.maxPaginas === 'number' ? o.maxPaginas : 20),
  }
}

export function mergeSalvarPncp(existente: unknown, form: PncpFiltrosForm): Record<string, unknown> {
  const base =
    existente && typeof existente === 'object' && !Array.isArray(existente)
      ? { ...(existente as Record<string, unknown>) }
      : {}
  const uf = form.uf.trim().toUpperCase().slice(0, 2)
  if (uf.length === 2) base.uf = uf
  else delete base.uf
  const pal = form.palavrasChaveObjeto.trim()
  if (pal) base.palavrasChaveObjeto = pal
  else delete base.palavrasChaveObjeto
  base.diasJanela = Math.max(1, Math.min(90, Number(form.diasJanela) || 7))
  base.maxPaginas = Math.max(1, Math.min(50, Number(form.maxPaginas) || 20))
  if (base.modo === undefined) base.modo = 'atualizacao'
  if (base.codigoModalidadeContratacao === undefined) base.codigoModalidadeContratacao = 6
  return base
}
