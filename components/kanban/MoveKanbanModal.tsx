'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { KANBAN_COLUNAS, KANBAN_COLUNA_LABELS, type KanbanColuna } from '@/lib/kanban'

type Props = {
  open: boolean
  colunaDestino: KanbanColuna | null   // null = aberto pelo botão, precisa de seletor de coluna
  colunaAtual?: KanbanColuna           // coluna atual do card (para excluir do seletor)
  onConfirm: (colunaDestino: KanbanColuna, motivo?: string) => void
  onCancel: () => void
}

const MOTIVOS_SUGERIDOS: Partial<Record<KanbanColuna, string[]>> = {
  descartadas: [
    'Fora do escopo de produtos da Multiteiner',
    'Região geográfica sem atendimento',
    'Valor global inviável',
    'Requisitos técnicos incompatíveis',
    'Prazo insuficiente para participação',
  ],
  perdemos: [
    'Proposta com preço acima do menor lance',
    'Desclassificação técnica',
    'Documentação recusada',
    'Desistência estratégica',
  ],
}

const COLUNAS_QUE_EXIGEM_MOTIVO: KanbanColuna[] = ['descartadas', 'perdemos']

export function MoveKanbanModal({ open, colunaDestino, colunaAtual, onConfirm, onCancel }: Props) {
  const [motivo, setMotivo] = useState('')
  const [colunaSelecionada, setColunaSelecionada] = useState<KanbanColuna | ''>(
    colunaDestino ?? ''
  )

  const coluna = (colunaDestino ?? colunaSelecionada) as KanbanColuna | ''
  const exigeMotivo = coluna ? COLUNAS_QUE_EXIGEM_MOTIVO.includes(coluna) : false
  const label = coluna ? KANBAN_COLUNA_LABELS[coluna] : '—'
  const sugestoes = coluna ? (MOTIVOS_SUGERIDOS[coluna] ?? []) : []

  const podeMover = coluna !== '' && (!exigeMotivo || motivo.trim() !== '')

  function handleConfirm() {
    if (!coluna) return
    onConfirm(coluna, motivo.trim() || undefined)
    setMotivo('')
    setColunaSelecionada('')
  }

  function handleCancel() {
    setMotivo('')
    setColunaSelecionada('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {colunaDestino ? `Mover para "${label}"` : 'Mover card'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Seletor de coluna — apenas quando aberto via botão (sem destino pré-definido) */}
          {!colunaDestino && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Coluna destino</label>
              <select
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                value={colunaSelecionada}
                onChange={(e) => setColunaSelecionada(e.target.value as KanbanColuna)}
              >
                <option value="">Selecione...</option>
                {KANBAN_COLUNAS
                  .filter((c) => c !== colunaAtual)
                  .map((c) => (
                    <option key={c} value={c}>{KANBAN_COLUNA_LABELS[c]}</option>
                  ))}
              </select>
            </div>
          )}

          {exigeMotivo && (
            <>
              <p className="text-xs text-slate-500">
                Informe o motivo para registrar no histórico.
              </p>
              {sugestoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMotivo(s)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
                rows={3}
                placeholder="Descreva o motivo..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!podeMover}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
