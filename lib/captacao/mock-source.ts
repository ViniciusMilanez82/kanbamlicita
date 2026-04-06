import type { CaptacaoRegistroBruto, CaptacaoSource } from './types'

function buildMockRecords(fonteId: string): CaptacaoRegistroBruto[] {
  const stamp = Date.now()

  return [
    {
      idExternoOrigem: `${fonteId}-mock-${stamp}-1`,
      payloadBruto: {
        orgao: 'Prefeitura Exemplo',
        numero: `PE-${stamp}-01`,
        objeto: 'Locação de módulos temporários para apoio operacional',
      },
    },
    {
      idExternoOrigem: `${fonteId}-mock-${stamp}-2`,
      payloadBruto: {
        orgao: 'Companhia Exemplo',
        numero: `PE-${stamp}-02`,
        objeto: 'Fornecimento de estruturas modulares para canteiro de obras',
      },
    },
  ]
}

export function createMockSource(fonteId: string): CaptacaoSource {
  return {
    tipo: 'mock',
    async fetch() {
      return buildMockRecords(fonteId)
    },
  }
}
