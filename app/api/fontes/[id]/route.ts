import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nome, tipo, parametros, filtros, periodicidade, ativo } = body;

  const existente = await db.fonteCaptacao.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
  }

  if (tipo !== undefined) {
    const tiposValidos = ["pncp", "rss", "scraping", "api_generica"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use: pncp, rss, scraping ou api_generica" },
        { status: 400 }
      );
    }
  }

  const dados: Record<string, unknown> = {};
  if (nome !== undefined) dados.nome = nome;
  if (tipo !== undefined) dados.tipo = tipo;
  if (parametros !== undefined) dados.parametros = parametros;
  if (filtros !== undefined) dados.filtros = filtros;
  if (periodicidade !== undefined) dados.periodicidade = periodicidade;
  if (ativo !== undefined) dados.ativo = ativo;

  const fonte = await db.fonteCaptacao.update({
    where: { id },
    data: dados,
  });

  return NextResponse.json(fonte);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const existente = await db.fonteCaptacao.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
  }

  await db.fonteCaptacao.update({
    where: { id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}
