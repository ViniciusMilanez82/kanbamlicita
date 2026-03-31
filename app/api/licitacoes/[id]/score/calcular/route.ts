import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { calcularScore } from "@/lib/score/calculator";
import type { AnaliseData, AnaliseIaResultado } from "@/lib/score/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json(
      { error: "Licitação não encontrada" },
      { status: 404 }
    );
  }

  const analise = await db.licitacaoAnalise.findUnique({
    where: { licitacaoId: id },
  });

  if (!analise) {
    return NextResponse.json(
      {
        error: "É necessário preencher a análise antes de calcular o score",
      },
      { status: 400 }
    );
  }

  const analiseIa = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });

  const analiseIaResultado =
    analiseIa?.status === "concluido" && analiseIa.resultadoJson
      ? (analiseIa.resultadoJson as unknown as AnaliseIaResultado)
      : null;

  const valorEstimado = licitacao.valorEstimado
    ? Number(licitacao.valorEstimado)
    : null;

  const resultado = calcularScore(
    analise as unknown as AnaliseData,
    analiseIaResultado,
    valorEstimado
  );

  return NextResponse.json(resultado);
}
