import type { PrismaClient } from "../generated/prisma/client";

export const FONTE_PNCP_NOME = "PNCP — API de consultas (oficial)";

/** Garante uma fonte PNCP existente no banco (idempotente). */
export async function ensureDefaultPncpFonte(client: PrismaClient) {
  const existing = await client.fonteCaptacao.findFirst({
    where: { tipo: "pncp" },
  });
  if (existing) {
    return existing;
  }

  return client.fonteCaptacao.create({
    data: {
      nome: FONTE_PNCP_NOME,
      tipo: "pncp",
      ativo: true,
      parametros: {},
      filtros: { palavrasChave: ["container", "contêiner", "empilhadeira"] },
      periodicidade: "12h",
    },
  });
}
