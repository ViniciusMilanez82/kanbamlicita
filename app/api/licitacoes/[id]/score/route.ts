import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const score = await db.licitacaoScore.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json(score);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();

  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json(
      { error: "Licitação não encontrada" },
      { status: 404 }
    );
  }

  if (body.scoreFinal == null || body.classificacao == null) {
    return NextResponse.json(
      { error: "scoreFinal e classificacao são obrigatórios" },
      { status: 400 }
    );
  }

  const data = {
    scoreFinal: Number(body.scoreFinal),
    classificacao: body.classificacao,
    scoreAderenciaDireta:
      body.scoreAderenciaDireta != null ? Number(body.scoreAderenciaDireta) : null,
    scoreAderenciaAplicacao:
      body.scoreAderenciaAplicacao != null ? Number(body.scoreAderenciaAplicacao) : null,
    scoreContextoOculto:
      body.scoreContextoOculto != null ? Number(body.scoreContextoOculto) : null,
    scoreModeloComercial:
      body.scoreModeloComercial != null ? Number(body.scoreModeloComercial) : null,
    scorePotencialEconomico:
      body.scorePotencialEconomico != null
        ? Number(body.scorePotencialEconomico)
        : null,
    scoreQualidadeEvidencia:
      body.scoreQualidadeEvidencia != null
        ? Number(body.scoreQualidadeEvidencia)
        : null,
    scoreJustificativaResumida: body.scoreJustificativaResumida ?? null,
    valorCapturavelEstimado: body.valorCapturavelEstimado ?? null,
    valorCapturavelFaixaMin: body.valorCapturavelFaixaMin ?? null,
    valorCapturavelFaixaMax: body.valorCapturavelFaixaMax ?? null,
    valorCapturavelMoeda: body.valorCapturavelMoeda ?? "BRL",
    valorCapturavelNivelConfianca: body.valorCapturavelNivelConfianca ?? null,
    valorCapturavelMetodoEstimativa:
      body.valorCapturavelMetodoEstimativa ?? null,
    valorCapturavelJustificativa: body.valorCapturavelJustificativa ?? null,
    valorCapturavelBaseDocumental: body.valorCapturavelBaseDocumental ?? null,
    valorCapturavelObservacao: body.valorCapturavelObservacao ?? null,
    falsoNegativoExisteRisco: body.falsoNegativoExisteRisco ?? false,
    falsoNegativoNivelRisco: body.falsoNegativoNivelRisco ?? null,
    falsoNegativoMotivos: body.falsoNegativoMotivos ?? null,
    falsoNegativoTrechosCriticos: body.falsoNegativoTrechosCriticos ?? null,
    falsoNegativoResumo: body.falsoNegativoResumo ?? null,
  };

  const score = await db.licitacaoScore.upsert({
    where: { licitacaoId: id },
    update: data,
    create: { licitacaoId: id, ...data },
  });

  return NextResponse.json(score);
}
