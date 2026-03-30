import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await ctx.params;

  const licitacao = await db.licitacao.findUnique({
    where: { id },
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
          responsavel: { select: { id: true, name: true } },
        },
      },
      movimentacoes: {
        orderBy: { criadoEm: "desc" },
        take: 50,
      },
      acoesIa: {
        orderBy: { criadoEm: "desc" },
        take: 10,
      },
    },
  });

  if (!licitacao) return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });

  return NextResponse.json(licitacao);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await ctx.params;
  const body = await req.json();

  const { titulo, orgao, objeto, modalidade, uf, municipio, valorEstimado, dataPublicacao, dataSessao, linkOrigem, observacoes, dadosExtraidos } = body;

  const licitacao = await db.licitacao.update({
    where: { id },
    data: {
      titulo,
      orgao,
      objeto,
      modalidade,
      uf,
      municipio,
      valorEstimado,
      dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : undefined,
      dataSessao: dataSessao ? new Date(dataSessao) : undefined,
      linkOrigem,
      observacoes,
      dadosExtraidos,
    },
  });

  return NextResponse.json(licitacao);
}
