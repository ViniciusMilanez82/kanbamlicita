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

  const analise = await db.licitacaoAnalise.findUnique({
    where: { licitacaoId: id },
  });

  const analiseIa = await db.licitacaoAnaliseIa.findUnique({
    where: { licitacaoId: id },
  });

  return NextResponse.json({ analise, analiseIa });
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

  const analise = await db.licitacaoAnalise.upsert({
    where: { licitacaoId: id },
    update: {
      aderenciaDiretaExiste: body.aderenciaDiretaExiste ?? null,
      aderenciaDiretaNivel: body.aderenciaDiretaNivel ?? null,
      aderenciaAplicacaoExiste: body.aderenciaAplicacaoExiste ?? null,
      aderenciaAplicacaoNivel: body.aderenciaAplicacaoNivel ?? null,
      contextoOcultoExiste: body.contextoOcultoExiste ?? null,
      contextoOcultoNivel: body.contextoOcultoNivel ?? null,
      oportunidadeOcultaExiste: body.oportunidadeOcultaExiste ?? null,
      oportunidadeOcultaForca: body.oportunidadeOcultaForca ?? null,
      oportunidadeOcultaResumo: body.oportunidadeOcultaResumo ?? null,
      oportunidadeNoObjeto: body.oportunidadeNoObjeto ?? false,
      oportunidadeNoTr: body.oportunidadeNoTr ?? false,
      oportunidadeNosLotes: body.oportunidadeNosLotes ?? false,
      oportunidadeNosItens: body.oportunidadeNosItens ?? false,
      oportunidadeNaPlanilha: body.oportunidadeNaPlanilha ?? false,
      oportunidadeNoMemorial: body.oportunidadeNoMemorial ?? false,
      oportunidadeEmAnexoTecnico: body.oportunidadeEmAnexoTecnico ?? false,
    },
    create: {
      licitacaoId: id,
      aderenciaDiretaExiste: body.aderenciaDiretaExiste ?? null,
      aderenciaDiretaNivel: body.aderenciaDiretaNivel ?? null,
      aderenciaAplicacaoExiste: body.aderenciaAplicacaoExiste ?? null,
      aderenciaAplicacaoNivel: body.aderenciaAplicacaoNivel ?? null,
      contextoOcultoExiste: body.contextoOcultoExiste ?? null,
      contextoOcultoNivel: body.contextoOcultoNivel ?? null,
      oportunidadeOcultaExiste: body.oportunidadeOcultaExiste ?? null,
      oportunidadeOcultaForca: body.oportunidadeOcultaForca ?? null,
      oportunidadeOcultaResumo: body.oportunidadeOcultaResumo ?? null,
      oportunidadeNoObjeto: body.oportunidadeNoObjeto ?? false,
      oportunidadeNoTr: body.oportunidadeNoTr ?? false,
      oportunidadeNosLotes: body.oportunidadeNosLotes ?? false,
      oportunidadeNosItens: body.oportunidadeNosItens ?? false,
      oportunidadeNaPlanilha: body.oportunidadeNaPlanilha ?? false,
      oportunidadeNoMemorial: body.oportunidadeNoMemorial ?? false,
      oportunidadeEmAnexoTecnico: body.oportunidadeEmAnexoTecnico ?? false,
    },
  });

  return NextResponse.json(analise);
}
