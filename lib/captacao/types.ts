export type CaptacaoRegistroBruto = {
  idExternoOrigem?: string | null
  payloadBruto: Record<string, unknown>
}

export type CaptacaoSource = {
  tipo: string
  fetch: () => Promise<CaptacaoRegistroBruto[]>
}

export type SyncResult = {
  execucaoId: string
  status: 'concluido' | 'erro'
  totalLidos: number
  totalNovos: number
  totalAtualizados: number
  totalErros: number
  /** Quando `status === 'erro'`, mensagem para a UI (API devolve em `error`). */
  error?: string
}
