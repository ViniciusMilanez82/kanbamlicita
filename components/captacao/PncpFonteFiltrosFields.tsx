'use client'

import type { PncpFiltrosForm } from '@/lib/captacao/pncp-ui-config'

export type PncpFonteFiltrosDensity = 'comfortable' | 'compact'

type Props = {
  value: PncpFiltrosForm
  onChange: (next: PncpFiltrosForm) => void
  density?: PncpFonteFiltrosDensity
  /** Prefixo para ids de acessibilidade quando há vários formulários na página */
  idPrefix?: string
}

/** Campos únicos de UF, janela, páginas e palavras-chave — usado em Importar e Configurações. */
export function PncpFonteFiltrosFields({
  value,
  onChange,
  density = 'comfortable',
  idPrefix = 'pncp-filtros',
}: Props) {
  const isCompact = density === 'compact'
  const input =
    'w-full border border-slate-300 ' +
    (isCompact ? 'rounded-md px-2 py-1.5 text-xs' : 'rounded-lg px-2 py-1.5 text-sm')
  const label = 'mb-0.5 block font-medium text-slate-600 ' + (isCompact ? 'text-[11px]' : 'text-xs')

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className={label} id={`${idPrefix}-uf-label`}>
          UF (opcional)
        </span>
        <input
          type="text"
          maxLength={2}
          value={value.uf}
          onChange={(e) => onChange({ ...value, uf: e.target.value.toUpperCase() })}
          placeholder={isCompact ? 'Ex.: SP' : 'SP'}
          className={`${input} uppercase`}
          aria-labelledby={`${idPrefix}-uf-label`}
        />
      </label>
      <label className="block sm:col-span-1">
        <span className={label} id={`${idPrefix}-janela-label`}>
          Janela (dias) / Máx. páginas por importação
        </span>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={90}
            value={value.diasJanela}
            onChange={(e) => onChange({ ...value, diasJanela: e.target.value })}
            className={input}
            aria-labelledby={`${idPrefix}-janela-label`}
          />
          <input
            type="number"
            min={1}
            max={50}
            value={value.maxPaginas}
            onChange={(e) => onChange({ ...value, maxPaginas: e.target.value })}
            className={input}
            aria-labelledby={`${idPrefix}-janela-label`}
          />
        </div>
      </label>
      <label className="block sm:col-span-2">
        <span className={label} id={`${idPrefix}-palavras-label`}>
          Palavras no objeto (vírgula ou linha; OR — pelo menos uma no texto da licitação)
        </span>
        <textarea
          value={value.palavrasChaveObjeto}
          onChange={(e) => onChange({ ...value, palavrasChaveObjeto: e.target.value })}
          placeholder="container, módulo, alojamento, obra…"
          rows={isCompact ? 2 : 2}
          className={input}
          aria-labelledby={`${idPrefix}-palavras-label`}
        />
      </label>
    </div>
  )
}
