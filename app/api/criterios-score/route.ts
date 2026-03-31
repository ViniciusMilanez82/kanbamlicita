import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const criterios = await db.criterioScore.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(criterios);
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, descricao, tipo, peso, formulaRef, faixaMin, faixaMax, ordem } = body;

  if (!nome || !descricao || !tipo || peso == null) {
    return NextResponse.json(
      { error: "Nome, descrição, tipo e peso são obrigatórios" },
      { status: 400 }
    );
  }

  const criterio = await db.criterioScore.create({
    data: {
      nome,
      descricao,
      tipo,
      peso: Number(peso),
      formulaRef: formulaRef ?? null,
      faixaMin: faixaMin != null ? Number(faixaMin) : null,
      faixaMax: faixaMax != null ? Number(faixaMax) : null,
      ordem: ordem ?? 0,
    },
  });

  await registrarAuditoria({
    tabela: "criterios_score",
    registroId: criterio.id,
    campo: "*",
    valorNovo: nome,
    acao: "criacao",
    alteradoPorId: auth.userId,
  });

  return NextResponse.json(criterio, { status: 201 });
}
