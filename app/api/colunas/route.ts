import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const colunas = await db.kanbanColuna.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(colunas);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
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
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
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
