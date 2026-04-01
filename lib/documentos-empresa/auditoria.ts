import { db } from "@/lib/db";
import type { AcaoAuditoriaDoc } from "@/lib/generated/prisma/client";

/**
 * Registra uma ação de auditoria imutável no módulo documental.
 */
export async function registrarAuditoriaDoc(data: {
  documentoId: string;
  acao: AcaoAuditoriaDoc;
  detalhes?: string;
  realizadoPorId: string;
}) {
  return db.auditoriaDocumento.create({
    data: {
      documentoId: data.documentoId,
      acao: data.acao,
      detalhes: data.detalhes ?? null,
      realizadoPorId: data.realizadoPorId,
    },
  });
}
