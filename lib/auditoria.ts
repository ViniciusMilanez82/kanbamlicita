import { db } from "@/lib/db";
import type { AcaoAuditoria } from "@/lib/generated/prisma/client";

interface RegistroAuditoria {
  tabela: string;
  registroId: string;
  campo: string;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  acao: AcaoAuditoria;
  alteradoPorId: string;
}

export async function registrarAuditoria(dados: RegistroAuditoria) {
  return db.auditoriaParametro.create({
    data: {
      tabela: dados.tabela,
      registroId: dados.registroId,
      campo: dados.campo,
      valorAnterior: dados.valorAnterior ?? null,
      valorNovo: dados.valorNovo ?? null,
      acao: dados.acao,
      alteradoPorId: dados.alteradoPorId,
    },
  });
}

/**
 * Compara dois objetos e registra auditoria para cada campo que mudou.
 */
export async function registrarAuditoriaDiff(
  tabela: string,
  registroId: string,
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  alteradoPorId: string
) {
  const promessas: Promise<unknown>[] = [];

  for (const campo of Object.keys(depois)) {
    const valorAnterior = antes[campo];
    const valorNovo = depois[campo];

    if (String(valorAnterior ?? "") !== String(valorNovo ?? "")) {
      promessas.push(
        registrarAuditoria({
          tabela,
          registroId,
          campo,
          valorAnterior: valorAnterior != null ? String(valorAnterior) : null,
          valorNovo: valorNovo != null ? String(valorNovo) : null,
          acao: "edicao",
          alteradoPorId,
        })
      );
    }
  }

  await Promise.all(promessas);
}
