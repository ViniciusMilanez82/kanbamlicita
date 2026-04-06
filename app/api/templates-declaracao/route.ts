import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") ?? "";
  const ativo = searchParams.get("ativo");

  const where: Record<string, unknown> = {};

  if (categoria) {
    where.categoria = categoria;
  }

  if (ativo !== null && ativo !== "") {
    where.ativo = ativo === "true";
  }

  const templates = await db.templateDeclaracao.findMany({
    where,
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { nome, descricao, categoria, conteudoHtml, variaveis } = body;

  if (!nome?.trim()) {
    return NextResponse.json(
      { error: "Nome do template e obrigatorio" },
      { status: 400 }
    );
  }

  if (!categoria?.trim()) {
    return NextResponse.json(
      { error: "Categoria e obrigatoria" },
      { status: 400 }
    );
  }

  if (!conteudoHtml?.trim()) {
    return NextResponse.json(
      { error: "Conteudo HTML e obrigatorio" },
      { status: 400 }
    );
  }

  const template = await db.templateDeclaracao.create({
    data: {
      nome: nome.trim(),
      descricao: descricao || null,
      categoria: categoria.trim(),
      conteudoHtml: conteudoHtml.trim(),
      variaveis: variaveis ?? [],
    },
  });

  return NextResponse.json(template, { status: 201 });
}
