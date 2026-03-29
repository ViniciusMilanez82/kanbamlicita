import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
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
