import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const produtos = await db.produto.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(produtos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, categoria, palavrasChave } = body;

  if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const produto = await db.produto.create({
    data: { nome, descricao, categoria, palavrasChave: palavrasChave ?? [] },
  });

  return NextResponse.json(produto, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { id, nome, descricao, categoria, palavrasChave, ativo } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  const produto = await db.produto.update({
    where: { id },
    data: { nome, descricao, categoria, palavrasChave, ativo },
  });

  return NextResponse.json(produto);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  await db.produto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
