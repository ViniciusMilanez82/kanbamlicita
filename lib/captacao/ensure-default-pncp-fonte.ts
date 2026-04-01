import type { PrismaClient } from '../generated/prisma/client'

export const FONTE_PNCP_NOME = 'PNCP — API de consultas (oficial)'
export const FONTE_PNCP_ENDPOINT = 'https://pncp.gov.br/api/consulta'

const CONFIG_PADRAO = {
  modo: 'atualizacao' as const,
  codigoModalidadeContratacao: 6,
  diasJanela: 7,
  maxPaginas: 20,
  tamanhoPagina: 50,
}

/** Garante uma fonte PNCP já apontando para a API pública oficial (idempotente). */
export async function ensureDefaultPncpFonte(client: PrismaClient) {
  const existing = await client.captacaoFonte.findFirst({
    where: { tipo: 'pncp' },
  })
  if (existing) {
    return existing
  }

  return client.captacaoFonte.create({
    data: {
      nome: FONTE_PNCP_NOME,
      tipo: 'pncp',
      endpointBase: FONTE_PNCP_ENDPOINT,
      ativo: true,
      configuracao: CONFIG_PADRAO,
    },
  })
}
