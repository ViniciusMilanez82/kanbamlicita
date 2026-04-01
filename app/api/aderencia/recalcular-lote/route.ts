import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { avaliarEPersistir } from "@/lib/aderencia/pipeline-hook";

// POST — recalcular aderência de todas as licitações
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const licitacoes = await db.licitacao.findMany({
    select: { id: true },
  });

  let sucesso = 0;
  let erros = 0;

  // Processar em batches de 10 para não sobrecarregar
  const BATCH_SIZE = 10;
  for (let i = 0; i < licitacoes.length; i += BATCH_SIZE) {
    const batch = licitacoes.slice(i, i + BATCH_SIZE);
    const resultados = await Promise.allSettled(
      batch.map((l) => avaliarEPersistir(l.id))
    );
    for (const r of resultados) {
      if (r.status === "fulfilled") sucesso++;
      else erros++;
    }
  }

  return NextResponse.json({
    total: licitacoes.length,
    sucesso,
    erros,
  });
}
