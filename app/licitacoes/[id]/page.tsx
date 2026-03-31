import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LicitacaoDetailClient } from "./client";

export default async function LicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    include: {
      score: { select: { scoreFinal: true, classificacao: true } },
    },
  });

  if (!licitacao) notFound();

  // Serialize for client: convert Decimal to string
  const serialized = {
    ...licitacao,
    valorEstimado: licitacao.valorEstimado != null ? String(licitacao.valorEstimado) : null,
    score: licitacao.score
      ? { scoreFinal: licitacao.score.scoreFinal, classificacao: licitacao.score.classificacao }
      : null,
  };

  return <LicitacaoDetailClient licitacao={serialized} />;
}
