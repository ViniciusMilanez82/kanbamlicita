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

  const template = await db.templateDeclaracao.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;
  const body = await req.json();
  const { nome, descricao, categoria, conteudoHtml, variaveis, ativo } = body;

  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (descricao !== undefined) data.descricao = descricao || null;
  if (categoria !== undefined) data.categoria = categoria.trim();
  if (conteudoHtml !== undefined) data.conteudoHtml = conteudoHtml.trim();
  if (variaveis !== undefined) data.variaveis = variaveis;
  if (ativo !== undefined) data.ativo = ativo;

  const template = await db.templateDeclaracao.update({
    where: { id },
    data,
  });

  return NextResponse.json(template);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const existe = await db.templateDeclaracao.findUnique({ where: { id } });
  if (!existe) {
    return NextResponse.json(
      { error: "Template nao encontrado" },
      { status: 404 }
    );
  }

  await db.templateDeclaracao.delete({ where: { id } });
  return NextResponse.json({ message: "Template removido" });
}
