import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const fontes = await db.fonteCaptacao.findMany({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
    include: {
      execucoes: {
        orderBy: { iniciadaEm: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(fontes);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, tipo, parametros, filtros, periodicidade } = body;

  if (!nome || !tipo) {
    return NextResponse.json(
      { error: "Nome e tipo são obrigatórios" },
      { status: 400 }
    );
  }

  const fonte = await db.fonteCaptacao.create({
    data: {
      nome,
      tipo,
      parametros: parametros ?? {},
      filtros: filtros ?? null,
      periodicidade: periodicidade ?? null,
    },
  });

  return NextResponse.json(fonte, { status: 201 });
}
