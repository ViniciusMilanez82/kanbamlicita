'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type FiltrosKanban = {
  busca: string
  segmento: string
  classificacao: string
  uf: string
  urgentes: boolean
  riscoAltoFn: boolean
}

type Props = {
  filtros: FiltrosKanban
  onChange: (filtros: FiltrosKanban) => void
  segmentosDisponiveis: string[]
  ufsDisponiveis: string[]
}

export function FilterBar({ filtros, onChange, segmentosDisponiveis, ufsDisponiveis }: Props) {
  const update = (partial: Partial<FiltrosKanban>) =>
    onChange({ ...filtros, ...partial })

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-slate-50">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar objeto ou órgão..."
          className="pl-7 h-8 text-xs w-56"
          value={filtros.busca}
          onChange={(e) => update({ busca: e.target.value })}
        />
      </div>

      <Select value={filtros.segmento} onValueChange={(v) => update({ segmento: v ?? filtros.segmento })}>
        <SelectTrigger className="h-8 text-xs w-40">
          <SelectValue placeholder="Segmento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {segmentosDisponiveis.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.classificacao} onValueChange={(v) => update({ classificacao: v ?? filtros.classificacao })}>
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="Classificação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          {['A+', 'A', 'B', 'C', 'D'].map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.uf} onValueChange={(v) => update({ uf: v ?? filtros.uf })}>
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue placeholder="UF" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          {ufsDisponiveis.map((u) => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={filtros.urgentes}
          onChange={(e) => update({ urgentes: e.target.checked })}
          className="rounded border-slate-300"
        />
        Urgentes
      </label>

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={filtros.riscoAltoFn}
          onChange={(e) => update({ riscoAltoFn: e.target.checked })}
          className="rounded border-slate-300"
        />
        Risco alto FN
      </label>
    </div>
  )
}
