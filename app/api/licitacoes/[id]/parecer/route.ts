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

  const parecer = await db.licitacaoParecer.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json(parecer);
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
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  const data = {
    classificacaoFinal: body.classificacaoFinal ?? null,
    prioridadeComercial: body.prioridadeComercial ?? null,
    valeEsforcoComercial: body.valeEsforcoComercial ?? null,
    recomendacaoFinal: body.recomendacaoFinal ?? null,
    resumo: body.resumo ?? null,
    oportunidadeDireta: body.oportunidadeDireta ?? false,
    oportunidadeIndireta: body.oportunidadeIndireta ?? false,
    oportunidadeOcultaItemLoteAnexo: body.oportunidadeOcultaItemLoteAnexo ?? false,
    oportunidadeInexistente: body.oportunidadeInexistente ?? false,
    riscoFalsoPositivo: body.riscoFalsoPositivo ?? false,
    riscoFalsoNegativoSoTitulo: body.riscoFalsoNegativoSoTitulo ?? false,
    ondeEstaOportunidade: body.ondeEstaOportunidade ?? null,
    solucoesQueMultiteinerPoderiaOfertar: body.solucoesQueMultiteinerPoderiaOfertar ?? null,
    proximoPasosRecomendado: body.proximoPasosRecomendado ?? null,
    riscosLimitacoes: body.riscosLimitacoes ?? null,
    evidenciasPrincipais: body.evidenciasPrincipais ?? null,
  };

  const parecer = await db.licitacaoParecer.upsert({
    where: { licitacaoId: id },
    update: data,
    create: { licitacaoId: id, ...data },
  });

  return NextResponse.json(parecer);
}
