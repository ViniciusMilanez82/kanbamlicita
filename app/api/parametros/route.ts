import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");

  const where: Record<string, unknown> = { ativo: true };
  if (categoria) where.categoria = categoria;

  const parametros = await db.parametroEstrategico.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
  });

  return NextResponse.json(parametros);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { categoria, chave, valor, peso, descricao, ordem } = body;

  if (!categoria || !chave || !valor) {
    return NextResponse.json(
      { error: "Categoria, chave e valor são obrigatórios" },
      { status: 400 }
    );
  }

  const parametro = await db.parametroEstrategico.create({
    data: {
      categoria,
      chave,
      valor,
      peso: peso != null ? Number(peso) : null,
      descricao: descricao ?? null,
      ordem: ordem ?? 0,
    },
  });

  await registrarAuditoria({
    tabela: "parametros_estrategicos",
    registroId: parametro.id,
    campo: "*",
    valorNovo: valor,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(parametro, { status: 201 });
}
