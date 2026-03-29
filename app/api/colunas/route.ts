import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(colunas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if ((session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, cor, tipo } = body;

  if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const maxOrdem = await db.kanbanColuna.aggregate({ _max: { ordem: true } });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;

  const coluna = await db.kanbanColuna.create({
    data: { nome, ordem, cor: cor ?? "#3B82F6", tipo: tipo ?? "normal" },
  });

  return NextResponse.json(coluna, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if ((session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { id, nome, cor, tipo, ordem, ativo } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  const coluna = await db.kanbanColuna.update({
    where: { id },
    data: { nome, cor, tipo, ordem, ativo },
  });

  return NextResponse.json(coluna);
}
