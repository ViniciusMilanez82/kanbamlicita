import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") ?? "";
  const ativo = searchParams.get("ativo");

  const where: Record<string, unknown> = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { cnpj: { contains: busca } },
    ];
  }
  if (ativo !== null && ativo !== "") {
    where.ativo = ativo === "true";
  }

  const concorrentes = await db.concorrente.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { resultados: true } },
    },
  });

  return NextResponse.json(concorrentes);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const { nome, cnpj, segmentos, porte, uf, observacoes } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  // Check CNPJ uniqueness if provided
  if (cnpj) {
    const existe = await db.concorrente.findUnique({ where: { cnpj } });
    if (existe) {
      return NextResponse.json({ error: "Já existe um concorrente com este CNPJ" }, { status: 409 });
    }
  }

  const concorrente = await db.concorrente.create({
    data: {
      nome: nome.trim(),
      cnpj: cnpj?.trim() || null,
      segmentos: segmentos ?? [],
      porte: porte || null,
      uf: uf || null,
      observacoes: observacoes || null,
    },
  });

  return NextResponse.json(concorrente, { status: 201 });
}
