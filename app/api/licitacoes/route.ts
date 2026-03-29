import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const licitacoes = await db.licitacao.findMany({
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
          responsavel: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(licitacoes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { titulo, orgao, objeto, modalidade, uf, municipio, valorEstimado, dataPublicacao, dataSessao, linkOrigem, observacoes } = body;

  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  const colunaInicial = await db.kanbanColuna.findFirst({
    where: { tipo: "inicial", ativo: true },
    orderBy: { ordem: "asc" },
  });

  if (!colunaInicial) {
    return NextResponse.json({ error: "Nenhuma coluna inicial configurada" }, { status: 500 });
  }

  const licitacao = await db.licitacao.create({
    data: {
      titulo,
      orgao,
      objeto,
      modalidade,
      uf,
      municipio,
      valorEstimado,
      dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : null,
      dataSessao: dataSessao ? new Date(dataSessao) : null,
      linkOrigem,
      observacoes,
      card: {
        create: {
          colunaId: colunaInicial.id,
          ordem: 0,
        },
      },
    },
    include: {
      card: {
        include: {
          coluna: { select: { id: true, nome: true, cor: true } },
        },
      },
    },
  });

  return NextResponse.json(licitacao, { status: 201 });
}
