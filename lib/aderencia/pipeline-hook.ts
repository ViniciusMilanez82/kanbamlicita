import { db } from "@/lib/db";
import type { Licitacao } from "@/lib/generated/prisma/client";
import { avaliarAderencia } from "./avaliador";
import type { InputJsonValue } from "@prisma/client/runtime/client";

/**
 * Avalia aderencia de uma licitacao contra todas as regras ativas
 * e salva o resultado nos campos da licitacao.
 */
export async function avaliarEPersistir(
  licitacaoId: string
): Promise<void> {
  const [licitacao, regras] = await Promise.all([
    db.licitacao.findUnique({ where: { id: licitacaoId } }),
    db.regraAderencia.findMany({ where: { ativo: true } }),
  ]);

  if (!licitacao || regras.length === 0) return;

  const resultado = avaliarAderencia(licitacao as Licitacao, regras);

  await db.licitacao.update({
    where: { id: licitacaoId },
    data: {
      aderenciaAutomatica: resultado as unknown as InputJsonValue,
      scorePreliminar: resultado.scorePreliminar,
      classificacaoPreliminar: resultado.classificacao,
    },
  });
}
